# Unburden 🦥

### Do less. Move gently.

**Unburden is a browser-based AI task planner that turns an overwhelming brain dump into one manageable first step.** Instead of pushing you to do more, it asks how much energy you have and helps you make a smaller plan.

🌐 **Live demo:** https://iqrakhan2909.github.io/Unburden/  
💻 **Repository:** https://github.com/iqrakhan2909/Unburden

## 💡 The idea

Sometimes, the hardest part of a to-do list is deciding where to begin.

What if a productivity tool helped you carry less instead of asking you to do more?

Unburden lets you write down what's on your mind, select your current energy level, and get a suggested first action with optional next steps.

## ✨ Features

- **Brain dump:** Write down tasks without organizing them first.
- **Energy-aware planning:** Choose Barely, Some, or Plenty.
- **AI-generated suggestions:** Uses an open-weight text-to-text model through Transformers.js.
- **One small first step:** Makes getting started feel more manageable.
- **Optional next steps:** Keep your plan flexible.
- **Interactive checklist:** Check off completed actions.
- **Copy your plan:** Take your plan wherever you need it.
- **Fallback support:** Offers a basic rule-based plan if AI generation fails.
- **Responsive design:** A calm interface for different screen sizes.

## ⚙️ How it works

1. Enter your tasks, reminders, or mental clutter.
2. Choose your energy level.
3. The model runs inference in your browser.
4. Unburden organizes the generated response into a first action and optional next steps.
5. Review, check off, or copy your plan.

## 🛠️ Tech stack

- HTML
- CSS
- JavaScript (ES modules)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- Open-weight model: `Xenova/flan-t5-small`

Unburden is a static website. It doesn't require a custom backend, hosted AI inference server, or AI API key.

## 🚀 Run locally

### Using VS Code Live Server

1. Clone or download this repository.
2. Open the project folder in VS Code.
3. Install the Live Server extension if needed.
4. Right-click `index.html` and choose **Open with Live Server**.

### Using Python

Run this command from the project folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## 📁 Project structure

```text
Unburden/
├── index.html
├── style.css
├── script.js
└── README.md
```

## 🌍 Why open innovation matters

Using an open-weight model gives developers more flexibility to experiment, adapt the implementation, and build AI-powered experiences without depending on a hosted AI chat API.

Because inference happens in the browser, Unburden's task-planning flow doesn't need to send the user's brain dump to a hosted AI inference service. This reduces one source of data exposure, though it does not guarantee that all browser activity is private.

The model and application code must be downloaded, so an internet connection is required for initial loading. Fully offline operation is not guaranteed.

## ⚠️ Limitations

- AI suggestions may be imperfect. Review them before acting on them.
- Initial model loading requires internet access.
- Offline operation is not guaranteed.
- If the model fails, the rule-based fallback is not AI-generated.
- Avoid entering sensitive personal information.

## 🤝 Contributing

Suggestions, bug reports, and improvements are welcome.

1. Fork the repository.
2. Create a branch for your change.
3. Make and test your changes.
4. Open a pull request explaining your contribution.

Keep the core idea in mind: **reduce friction without adding pressure.**

## 📄 License

A license has not yet been added. Until one is included, don't assume the project is licensed for reuse, distribution, or modification.

---

**Less overwhelm. One next move. Slow is still a speed.** 🦥