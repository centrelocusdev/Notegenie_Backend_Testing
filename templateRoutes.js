const router = require("express").Router();
const Template = require('./templateModal')
const User = require("./userModal");
const PredefinedTemplates = require('./predefinedTemplateModal')

router.post('/create-template', async (req, res) => {
  try {
    const template = new Template(req.body) 

    await template.save()
    res.status(200).send({status: 'success', message: 'template created successfully'})
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
})

router.get('/get-templates/:userId', async (req, res) => {
  try {
    const userId = req.params.userId
    const templates = await Template.find({userId})

    res.status(200).send({status: 'success', data: templates})
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
})

router.delete('/delete-template/:id', async (req, res) => {
  try {
    const id = req.params.id
    await Template.findByIdAndDelete(id)
    res.send({status: 'success', message: 'deleted template successfuy'})
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
})

router.get('/get-template/:id', async (req, res) => {
  try {
    const id = req.params.id
    const template =  await Template.findById(id)
    if(!template) throw new Error('No template found')
    else res.send({status: 'success', data: template})
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
})

router.get('/predefined-templates/:profession', async (req, res) => {
  try {
    const profession = req.params.profession
    const templates = await PredefinedTemplates.find({profession})
    if(!templates) throw new Error('No template found')
    else res.send({status: 'success', data: templates})
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
})

router.get('/predefined-template-by-id/:id', async (req, res) => {
  try {
    const id = req.params.id
    const template = await PredefinedTemplates.findById(id)
    if(!template) throw new Error('No template found')
    else res.send({status: 'success', data: template})
  } catch (err) {
    res.status(400).send({ status: "error", message: err.message });
  }
})

module.exports = router