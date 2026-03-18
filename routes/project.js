const express = require('express');
const projectRouter = express.Router();
const verifyToken = require('../middlewares/auth');
const { body, validationResult, param } = require('express-validator');
const {showHistoryPage,projectMaker,showAll,findFilterHandler,myApplicationHandler,projectApplicantsHandler,approveApplicantHandler,rejectApplicantHandler,removeApprovedUserHandler,completeProjectHandler} = require('../controllers/project');
const project = require('../models/project');
projectRouter.get('/create',verifyToken,(req,res)=>{
    res.render('project-form', { currentPath: req.path });
})

projectRouter.post('/create', verifyToken,
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('desc').trim().notEmpty().withMessage('Description is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).render('project-form', { error: errors.array()[0].msg, currentPath: req.path });
    next();
  },
  projectMaker)

projectRouter.get('/show',verifyToken,showAll);
projectRouter.get('/find',verifyToken,findFilterHandler);

projectRouter.post('/apply/:projectId', verifyToken, async (req, res) => {
  const projectId = req.params.projectId;
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).send('Invalid project id');
  }
  const userId = req.user.id;

  try {
    const targetProject = await project.findById(projectId);

    if (!targetProject) {
      return res.status(404).send("Project not found");
    }

    // Prevent user from applying to their own project
    if (targetProject.createdBy.toString() === userId.toString()) {
      return res.status(400).send("You cannot apply to your own project");
    }

    // Check if project is still open
    if (targetProject.status !== 'OPEN') {
      return res.redirect('/project/find');
    }

    // Check if user has already applied or been rejected
    const alreadyApplied = targetProject.applicants.some(app => app.user.toString() === userId);
    const alreadyRejected = targetProject.rejected_users.some(u => u.toString() === userId);
    const alreadyApproved = targetProject.approved_users.some(u => u.toString() === userId);

    if (alreadyApplied || alreadyRejected || alreadyApproved) {
      return res.redirect('/project/find');
    }

    // Check if project has available seats
    const currentApproved = targetProject.approved_users.length;
    const maxSeats = targetProject.maxApplicants || 1;
    if (currentApproved >= maxSeats) {
      return res.redirect('/project/find');
    }

    // Add new applicant
    if (!Array.isArray(targetProject.applicants)) {
      targetProject.applicants = [];
    }

    targetProject.applicants.push({
      user: userId,
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
projectRouter.post('/:projectId/applicants/:applicantId/approve',verifyToken,approveApplicantHandler);
projectRouter.post('/:projectId/applicants/:applicantId/reject',verifyToken,rejectApplicantHandler);
projectRouter.post('/:projectId/approved/:userId/remove',verifyToken,removeApprovedUserHandler);
projectRouter.post('/:projectId/complete',verifyToken,completeProjectHandler);
projectRouter.get('/history',verifyToken,showHistoryPage);
module.exports = projectRouter;