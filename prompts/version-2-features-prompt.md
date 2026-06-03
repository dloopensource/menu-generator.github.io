Create a plan to implement support for more image generation models in the web app.

## Objective

A user will use a dropdown to select which image generation models they want to use for generating the graphical
menu. The web app will then use the selected model to generate the images based on the user's input.

### New image generation models

- OpenAI Image API (`gpt-image-1` and later models)
    - Generations: Generate images from scratch based on a text prompt
    - Edits: Modify existing images using a new prompt, either partially or entirely
- Google Gemini API:
    - gemini-3.1-flash-image-preview: This model serves as the high-efficiency counterpart to Gemini 3 Pro Image,
      optimized for speed and high-volume
      developer use cases.
    - gemini-3-pro-image-preview: This model is designed for professional asset production, utilizing advanced
      reasoning ("Thinking") to follow complex instructions and render high-fidelity text.

### Existing image generation models

- Google Gemini API:
    - gemini-2.5-flash-image: https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image for image
      generation

## Workflow

1. Use agents to break down the implementation into smaller tasks and assign them to different agents for parallel
   development.
2. Follow CLAUDE's guidelines for task management and tracking on GitHub Project
   board https://github.com/users/dloopensource/projects/2/views/1 to ensure that all work is organised and visible to
   the team.
3. Follow the specifications written in Allium for each task to ensure that all features are implemented according
   to the defined requirements.
