const project = require('../models/project');
const user = require('../models/user');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// --- NEW FUNCTION: Get Profile Statistics ---
async function getProfileStats(userId) {
    try {
        const [projectsCreated, projectsJoined, totalProjects] = await Promise.all([
            project.countDocuments({ createdBy: userId }),
            project.countDocuments({ approved_users: userId }),
            project.countDocuments({
                $or: [
                    { createdBy: userId },
                    { approved_users: userId }
                ]
            })
        ]);

        const completedProjects = await project.countDocuments({
            $or: [
                { createdBy: userId, status: 'FINISHED' },
                { approved_users: userId, status: 'FINISHED' }
            ]
        });

        const successRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

        return {
            projectsCreated,
            projectsJoined,
            totalProjects,
            completedProjects,
            successRate
        };
    } catch (err) {
        logger.error('Error getting profile stats: %o', err);
        return {
            projectsCreated: 0,
            projectsJoined: 0,
            totalProjects: 0,
            completedProjects: 0,
            successRate: 0
        };
    }
}

async function getUserActivities(userId) {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Get all projects created by user in the last year
        const createdProjects = await project.find({
          createdBy: userId,
          createdOn: { $gte: oneMonthAgo }
        }).select('createdOn title');

        // Get all applications by user in the last year
        const userApplications = await project.find({
          'applicants.user': userId,
          'applicants.appliedAt': { $gte: oneMonthAgo }
        }).select('applicants.$ title');

        // Get all approved projects for user in the last year
        const approvedProjects = await project.find({
          approved_users: userId,
          createdOn: { $gte: oneMonthAgo }
        }).select('createdOn title');

        // Combine all activities
        const activities = [];

        // Add project creations
        createdProjects.forEach(project => {
            activities.push({
                date: project.createdOn,
                type: 'created',
                title: project.title,
                description: 'Created project'
            });
        });

        // Add applications
        userApplications.forEach(project => {
            const application = project.applicants.find(app => app.user.toString() === userId.toString());
            if (application) {
                activities.push({
                    date: application.appliedAt,
                    type: 'applied',
                    title: project.title,
                    description: 'Applied to project'
                });
            }
        });

        // Add approvals (when user was approved for projects)
        approvedProjects.forEach(project => {
            activities.push({
                date: project.createdOn, // Using project creation date as approximation
                type: 'approved',
                title: project.title,
                description: 'Joined project'
            });
        });

        // Sort by date (most recent first)
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        return activities.slice(0, 50); // Limit to 50 most recent activities
    } catch (err) {
        logger.error('Error getting user activities: %o', err);
        return [];
    }
}

async function projectMaker(req, res) {
  const { title, desc, skills, domain, maxApplicants } = req.body;

  logger.info('Incoming project data: %o', { title, desc, skills, domain, maxApplicants, user: req.user });

  const seats = Math.min(Math.max(parseInt(maxApplicants, 10) || 1, 1), 4);

  const newProject = new project({
    title,
    desc,
    skills_req: skills,
    domain,
    createdBy: req.user.id, // Must come from verifyToken
    maxApplicants: seats,
    approved_users: [],
    status: 'OPEN',
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

    res.render('my-projects', { projects: filteredProjects, currentPath: req.path });
  } catch (err) {
    logger.error('Error fetching projects: %o', err);
    res.status(500).send("Server Error");
  }
}

// Helper: determines if two users are connected via an approved project
async function canViewPhone(viewerId, profileId) {
  // viewer sees profile owner's phone if either:
  // - profile owner approved viewer on a project they created
  // - viewer approved profile owner on a project they created
  const relation = await project.findOne({
    $or: [
      { createdBy: profileId, approved_users: viewerId },
      { createdBy: viewerId, approved_users: profileId },
    ],
  }).select('_id');

  return !!relation;
}


// async function findFilterHandler(req, res) {"}
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
    const commitment = req.query.commitment || '';
    const timeline = req.query.timeline || '';
    const teamSize = req.query.teamSize || '';
    const experience = req.query.experience || '';

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
        // Search by user and display profile, ignoring all filters
        const foundUser = await user.findOne({
          $or: [
            { name: new RegExp(searchValue, 'i') },
            { email: new RegExp(searchValue, 'i') },
          ],
        }).select('-password');

        if (foundUser) {
          const isOwnProfile = foundUser._id.toString() === req.user.id.toString();
          const phoneVisible = isOwnProfile ? true : await canViewPhone(req.user.id, foundUser._id);

          // Get profile statistics
          const stats = await getProfileStats(foundUser._id);

          // Get user activities for calendar
          const activities = await getUserActivities(foundUser._id);

          return res.render('profile', {
            user: foundUser,
            isOwnProfile,
            canViewPhone: phoneVisible,
            stats,
            activities,
            currentPath: req.path
          });
        } else {
          // No user found, show no projects
          projects = [];
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
      projects: projects || [],
      selectedDomains: selectedDomains || [],
      currentUserId: req.user.id,
      search: rawSearch || '',
      primaryDomain: primaryDomain || '',
      commitment: commitment || '',
      timeline: timeline || '',
      teamSize: teamSize || '',
      experience: experience || '',
      currentPath: req.path,
    });
  } catch (err) {
    logger.error('%o', err);
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

    // If the project is already finished / full, prevent new applications
    if (targetProject.status !== 'OPEN') {
      return res.redirect('/project/find');
    }

    // If the user is already approved, don't allow applying again
    if (Array.isArray(targetProject.approved_users) && targetProject.approved_users.some(u => u.toString() === userId)) {
      return res.redirect('/project/find');
    }

    // If the project has already hit max seats, close it
    if (Array.isArray(targetProject.approved_users) && targetProject.approved_users.length >= (targetProject.maxApplicants || 1)) {
      targetProject.status = 'FINISHED';
      await targetProject.save();
      return res.redirect('/project/find');
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
      .filter(proj => {
        const approved = Array.isArray(proj.approved_users) ? proj.approved_users.some(u => u.toString() === userId) : false;
        return !approved;
      })
      .map(proj => {
        let status = 'Pending';
        return {
          ...proj.toObject(),
          applicationStatus: status
        };
      });

    res.render('application', { projects: filtered, currentPath: req.path });
  } catch (err) {
    logger.error('Error loading applications: %o', err);
    res.status(500).send("Server Error");
  }
}


async function projectApplicantsHandler(req, res) {
  try {
    const project_ = await project.findOne({
      _id: req.params.projectId,
    })
      .populate({
        path: 'applicants.user',
        model: 'user'
      })
      .populate({
        path: 'approved_users',
        model: 'user'
      });

    if (!project_) return res.status(404).send('Project not found or is already finished');

    res.render('applicants', { project_, currentPath: req.path });
  } catch (err) {
    logger.error('%o', err);
    res.status(500).send('Server Error');
  }
}


async function approveApplicantHandler(req, res) {
  try {
    const { projectId, applicantId } = req.params;

    // Find the project
    const targetProject = await project.findById(projectId);
    if (!targetProject) {
      return res.status(404).send('Project not found');
    }

    // Check if user is the project creator
    if (targetProject.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    // Check if the applicant exists in the applicants list
    const isApplicantPresent = targetProject.applicants.some(app => app.user.toString() === applicantId);
    if (!isApplicantPresent) {
      return res.status(404).send('Applicant not found in the list');
    }

    // Check if already approved
    if (Array.isArray(targetProject.approved_users) && targetProject.approved_users.some(u => u.toString() === applicantId)) {
      return res.redirect(`/project/${projectId}/applicants`);
    }

    // Check if seats are available
    const currentApproved = (targetProject.approved_users && targetProject.approved_users.length) || 0;
    const maxSeats = targetProject.maxApplicants || 1;
    if (currentApproved >= maxSeats) {
      return res.redirect(`/project/${projectId}/applicants`);
    }

    // Ensure approved_users exists and add this applicant
    if (!Array.isArray(targetProject.approved_users)) {
      targetProject.approved_users = [];
    }

    if (!targetProject.approved_users.some(u => u.toString() === applicantId)) {
      targetProject.approved_users.push(applicantId);
    }

    // Remove the applicant from the applicants array
    targetProject.applicants = targetProject.applicants.filter(app => app.user.toString() !== applicantId);

    // Update project status to IN_PROGRESS if someone is approved
    if (targetProject.status === 'OPEN') {
      targetProject.status = 'IN_PROGRESS';
    }

    // Close the project if we've filled all seats
    if (targetProject.approved_users.length >= maxSeats) {
      targetProject.status = 'FINISHED';
    }

    // Save the changes
    await targetProject.save();

    res.redirect(`/project/${projectId}/applicants`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}

async function rejectApplicantHandler(req, res) {
  try {
    const { projectId, applicantId } = req.params;

    // Find the project
    const targetProject = await project.findById(projectId);
    if (!targetProject) {
      return res.status(404).send('Project not found');
    }

    // Check if user is the project creator
    if (targetProject.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    // Check if the applicant exists in the applicants list
    const isApplicantPresent = targetProject.applicants.some(app => app.user.toString() === applicantId);
    if (!isApplicantPresent) {
      return res.status(404).send('Applicant not found in the list');
    }

    // Ensure rejected_users exists and add this applicant
    if (!Array.isArray(targetProject.rejected_users)) {
      targetProject.rejected_users = [];
    }

    if (!targetProject.rejected_users.some(u => u.toString() === applicantId)) {
      targetProject.rejected_users.push(applicantId);
    }

    // Remove the applicant from the applicants array
    targetProject.applicants = targetProject.applicants.filter(app => app.user.toString() !== applicantId);

    // Save the changes
    await targetProject.save();

    res.redirect(`/project/${projectId}/applicants`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}

// ✅ NEW FUNCTION: Remove approved team member
async function removeApprovedUserHandler(req, res) {
  try {
    const { projectId, userId } = req.params;

    // Find the project
    const targetProject = await project.findById(projectId);
    if (!targetProject) {
      return res.status(404).send('Project not found');
    }

    // Check if user is the project creator
    if (targetProject.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    // Check if the user is in the approved list
    const isApproved = Array.isArray(targetProject.approved_users) && targetProject.approved_users.some(u => u.toString() === userId);
    if (!isApproved) {
      return res.status(404).send('User not found in approved list');
    }

    // Remove the user from approved_users array
    targetProject.approved_users = targetProject.approved_users.filter(u => u.toString() !== userId);

    // Revert project status if needed
    if (targetProject.status === 'FINISHED' && targetProject.approved_users.length > 0) {
      targetProject.status = 'IN_PROGRESS';
    } else if (targetProject.approved_users.length === 0) {
      targetProject.status = 'OPEN';
    }

    // Save the changes
    await targetProject.save();

    res.redirect(`/project/${projectId}/applicants`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}

async function completeProjectHandler(req, res) {
  try {
    const { projectId } = req.params;

    // Find the project
    const targetProject = await project.findById(projectId);
    if (!targetProject) {
      return res.status(404).send('Project not found');
    }

    // Check if user is the project creator
    if (targetProject.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    // Only allow completion if project is OPEN or IN_PROGRESS
    if (targetProject.status === 'FINISHED') {
      return res.redirect('/project/show');
    }

    // Set status to FINISHED
    targetProject.status = 'FINISHED';

    // Save the changes
    await targetProject.save();

    res.redirect('/project/show');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}

async function showHistoryPage(req, res) {
  const userId = req.user.id;

  // Active projects (both created and joined)
  const createdActive = await project.find({
    createdBy: userId,
    status: { $in: ['OPEN', 'IN_PROGRESS'] },
  }).populate('approved_users').sort({ createdOn: -1 });

  const joinedActive = await project.find({
    approved_users: userId,
    status: { $in: ['OPEN', 'IN_PROGRESS'] },
  }).populate('createdBy').sort({ createdOn: -1 });

  // Completed projects
  const createdFinished = await project.find({
    createdBy: userId,
    status: 'FINISHED',
  }).populate('approved_users').sort({ createdOn: -1 });

  const appliedFinished = await project.find({
    approved_users: userId,
    status: 'FINISHED',
  }).populate('createdBy').sort({ createdOn: -1 });

  res.render('history', {
    createdActive,
    joinedActive,
    createdFinished,
    appliedFinished,
    currentPath: req.path,
  });
}

module.exports = {
  showHistoryPage,
  projectMaker,
  showAll,
  findFilterHandler,
  applyToProjectHandler,
  myApplicationHandler,
  projectApplicantsHandler,
  approveApplicantHandler,
  rejectApplicantHandler,
  removeApprovedUserHandler,
  completeProjectHandler
};



