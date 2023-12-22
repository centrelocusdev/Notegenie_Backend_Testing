const router = require("express").Router();
const axios = require("axios");

const makeRequest = async (prompt) => {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );
  return response.data.choices[0];
};

router.post("/send-prompt", async (req, res) => { 
  try {
    let prompt = req.body.prompt
    const response = await makeRequest(prompt);
    res.send({status: 'success', data: response.message.content});
  } catch (err) { 
    res.send({ status: "error", message: err.message });
  }
});

module.exports = router;
