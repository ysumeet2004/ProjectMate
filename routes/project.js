const express = require('express');
const projectRouter = express.Router();
const verifyToken = require('../middlewares/auth');
const {showHistoryPage,projectMaker,showAll,findFilterHandler,myApplicationHandler,projectApplicantsHandler,IDKHandler} = require('../controllers/project');
const project = require('../models/project');
projectRouter.get('/create',verifyToken,(req,res)=>{
    res.render('project-form');
})

projectRouter.post('/create',verifyToken,projectMaker)

projectRouter.get('/show',verifyToken,showAll);
projectRouter.get('/find',verifyToken,findFilterHandler);

projectRouter.post('/apply/:projectId', verifyToken, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const targetProject = await project.findById(projectId);

    if (!targetProject) {
      return res.status(404).send("Project not found");
    }

    // Prevent user from applying to their own project
    if (targetProject.createdBy.toString() === req.user.id.toString()) {
      return res.status(400).send("You cannot apply to your own project");
    }

    // ❗ Prevent duplicate applications
    const alreadyApplied = (targetProject.applicants || []).some(applicantId =>
      applicantId.toString() === req.user.id.toString()
    );

    if (alreadyApplied) {
      console.log(`${req.user.name} has already applied to: ${targetProject.title}`);
      return res.redirect('/project/find'); // or show a message
    }

    // ✅ Push new applicant and save
    if (!Array.isArray(targetProject.applicants)) {
        targetProject.applicants = [];
         }
        targetProject.applicants.push({
          user: req.user.id,
          appliedAt: new Date()
        });
    await targetProject.save();

    console.log(`${req.user.name} applied to project: ${targetProject.title}`);
    res.redirect('/project/find');
  } catch (err) {
    console.error("🔥 Error applying to project:", err);
    res.status(500).send("Internal server error");
  }
});


projectRouter.get('/applications',verifyToken,myApplicationHandler);
projectRouter.get('/:projectId/applicants',verifyToken,projectApplicantsHandler);
projectRouter.post('/:projectId/applicants/:applicantId/approve',verifyToken,IDKHandler);
projectRouter.get('/history',verifyToken,showHistoryPage);
module.exports = projectRouter;