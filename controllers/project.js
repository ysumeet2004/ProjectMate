const project = require('../models/project');
const user = require('../models/user');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function projectMaker(req, res) {
  const { title, desc, skills, domain } = req.body;

  console.log('Incoming project data:', { title, desc, skills, domain, user: req.user });
  console.log(JSON.stringify(req.user, null, 2));

  const newProject = new project({
    title,
    desc,
    skills_req: skills,
    domain,
    createdBy: req.user.id // Must come from verifyToken
  });

  await newProject.save();
  res.redirect('/');
}

async function showAll(req, res) {
  try {
    const myProjects = await project.find({ createdBy: req.user.id, status: "OPEN" }).populate('applicants.user');

    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    // Filter applicants per project
    const filteredProjects = myProjects.map(project => {
      const filteredApplicants = project.applicants.filter(app => {
        return new Date(app.appliedAt) >= cutoff;
      });

      return {
        ...project.toObject(),
        applicants: filteredApplicants
      };
    });

    res.render('my-projects', { projects: filteredProjects });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).send("Server Error");
  }
}


// async function findFilterHandler(req, res) {
//   console.log("Decoded user:", req.user);


//   try {
//     const selectedDomains = req.query.domains; // checkbox values

//     let query = {
//       status: 'OPEN', // ✅ Only show active/open projects
//       createdBy: { $ne: req.user.id } // ✅ HIDE projects created by the current user
//     };

//     if (selectedDomains) {
//       if (Array.isArray(selectedDomains)) {
//         query.domain = { $in: selectedDomains };
//       } else {
//         query.domain = selectedDomains;
//       }
//     }
//     console.log("yoyo")

//     // ✅ Populate the applicants.user field to get the user's ID for checking
//     const projects = await project.find(query).populate('applicants.user');

//     res.render('finder', {
//       projects,
//       selectedDomains: selectedDomains || [],
//       currentUserId: req.user.id // ✅ Pass user's ID to EJS
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// }
async function findFilterHandler(req, res) {
  try {
    const selectedDomains = req.query.domains;
    const rawSearch = (req.query.search || '').trim();
    const primaryDomain = req.query.primaryDomain || '';

    let query = {
      status: 'OPEN',
    };

    // Domain filters (checkboxes + dropdown)
    const domainValues = [];
    if (selectedDomains) {
      if (Array.isArray(selectedDomains)) {
        domainValues.push(...selectedDomains);
      } else {
        domainValues.push(selectedDomains);
      }
    }
    if (primaryDomain && primaryDomain !== 'all') {
      domainValues.push(primaryDomain);
    }
    if (domainValues.length > 0) {
      query.domain = { $in: domainValues };
    }

    let projects = [];

    // Search logic
    if (rawSearch) {
      const isUserSearch = rawSearch.startsWith('@');
      const searchValue = isUserSearch ? rawSearch.slice(1).trim() : rawSearch;

      if (!searchValue) {
        // If they only typed "@", just ignore search and fall back to default query
        projects = await project
          .find(query)
          .sort({ createdOn: -1 });
      } else if (isUserSearch) {
        // Search by user (creator) when prefixed with '@'
        const users = await user.find({
          $or: [
            { name: new RegExp(searchValue, 'i') },
            { email: new RegExp(searchValue, 'i') },
          ],
        }).select('_id');

        const creatorIds = users.map((u) => u._id);

        if (creatorIds.length === 0) {
          projects = [];
        } else {
          projects = await project
            .find({ ...query, createdBy: { $in: creatorIds } })
            .sort({ createdOn: -1 });
        }
      } else if (mongoose.isValidObjectId(searchValue)) {
        // Search by exact project ID if it's a valid ObjectId
        projects = await project
          .find({ ...query, _id: searchValue })
          .sort({ createdOn: -1 });
      } else {
        // Otherwise, search by project title (case-insensitive)
        projects = await project
          .find({
            ...query,
            title: { $regex: searchValue, $options: 'i' },
          })
          .sort({ createdOn: -1 });
      }
    } else {
      // No search term – just apply filters + sort
      projects = await project
        .find(query)
        .sort({ createdOn: -1 });
    }

    res.render('finder', {
      projects,
      selectedDomains: selectedDomains || [],
      currentUserId: req.user.id,
      search: rawSearch,
      primaryDomain,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}

// ✅ NEW FUNCTION TO HANDLE "APPLY"
async function applyToProjectHandler(req, res) {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;

    const targetProject = await project.findById(projectId);

    if (!targetProject) {
      return res.status(404).send('Project not found');
    }

    // Check if user has already applied
    const hasApplied = targetProject.applicants.some(app => app.user.toString() === userId);

    if (hasApplied) {
      // If they already applied, just redirect them back.
      // You could add a flash message here ("You have already applied")
      // ✅ FIX: Changed redirect to singular
      return res.redirect('/project/find');
    }

    // Add new applicant to the array
    targetProject.applicants.push({
      user: userId,
      appliedAt: new Date()
    });

    await targetProject.save();

    // Redirect back to the finder page.
    // You could add a success flash message here ("Application successful!")
    // ✅ FIX: Changed redirect to singular
    res.redirect('/project/find');

  } catch (err) {
    res.status(500).send('Server Error');
  }
}


async function myApplicationHandler(req, res) {
  try {
    const userId = req.user.id;
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    // Fetch all projects the user has applied to recently
    const appliedProjects = await project.find({
      applicants: {
        $elemMatch: {
          user: userId,
          appliedAt: { $gte: cutoff }
        }
      },
      status: 'OPEN' // ✅ Only show non-finished projects
    }).populate('createdBy');

    // Filter out approved ones and add local status tag (pending/rejected)
    const filtered = appliedProjects
      .filter(proj => !proj.approved_user || proj.approved_user.toString() !== userId)
      .map(proj => {
        let status;
        if (!proj.approved_user) {
          status = 'Pending';
        } else {
          status = 'Rejected';
        }
        return {
          ...proj.toObject(),
          applicationStatus: status
        };
      });

    res.render('application', { projects: filtered });
  } catch (err) {
    console.error("Error loading applications:", err);
    res.status(500).send("Server Error");
  }
}


async function projectApplicantsHandler(req, res) {
  try {
    const project_ = await project.findOne({
      _id: req.params.projectId,
    }).populate({
      path: 'applicants.user',
      model: 'user'
    });

    if (!project_) return res.status(404).send('Project not found or is already finished');

    res.render('applicants', { project_ });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}


async function IDKHandler(req, res) {
  try {
    const { projectId, applicantId } = req.params;

    // Find the project
    const targetProject = await project.findById(projectId);
    if (!targetProject) {
      return res.status(404).send('Project not found');
    }

    // Check if the applicant exists in the applicants list
    const isApplicantPresent = targetProject.applicants.some(app => app.user.toString() === applicantId);
    if (!isApplicantPresent) {
      return res.status(404).send('Applicant not found in the list');
    }

    // Set the approved_user
    targetProject.approved_user = applicantId;
    targetProject.status = 'FINISHED';

    // Optionally, remove the applicant from the applicants array
    targetProject.applicants = targetProject.applicants.filter(app => app.user.toString() !== applicantId);

    // Save the changes
    await targetProject.save();

    // ✅ FIX: Change this redirect from plural to singular
    res.redirect('/project/show'); // Was /projects/show
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}

async function showHistoryPage(req, res) {
  const userId = req.user.id;

  const createdHistory = await project.find({
    createdBy: userId,
    status: 'FINISHED',
  }).populate('approved_user');

  const appliedHistory = await project.find({
    approved_user: userId,
    status: 'FINISHED',
  }).populate('createdBy');

  res.render('history', {
    createdHistory,
    appliedHistory,
    show: 'applied', // default toggle view
  });
}

module.exports = {
  showHistoryPage,
  projectMaker,
  showAll,
  findFilterHandler,
  applyToProjectHandler, // ✅ EXPORT THE NEW FUNCTION
  myApplicationHandler,
  projectApplicantsHandler,
  IDKHandler
};



