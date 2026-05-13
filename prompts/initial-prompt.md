@superpowers Create a plan to implement web app that generates a graphical menu for menu items based on user input.

## Objective

The graphical menu generator can be created by using the following fields:

- text-to-image: Text input box to enter a description of the menu item(s) (e.g. "a burger with fries and a soda").
- text-and-image-to-image: Image upload with drag and drop or icon to open file explorer (e.g. opens Mac OS X finder) to
  select an image from the user's device with the menu item(s).

If the user uploads an image, the web app will use the image as a reference for the menu item(s). Otherwise, the web
app will then generate a menu item(s) based on the text input.

User will then click the "Generate Menu" button to generate the graphical menu with the text descriptions of each menu
item.

## Workflow

1. Use agents to break down the implementation into smaller tasks and assign them to different agents for parallel
   development.
2. Follow CLAUDE's guidelines for task management and tracking on GitHub Project
   board https://github.com/users/dloopensource/projects/2/views/1 to ensure that all work is organised and visible to
   the team.
3. Follow the specifications written in Allium for each task to ensure that all features are implemented according
   to the defined requirements.
4. Each agent will be responsible for implementing a specific feature or component of the web app, such as the text
   input box, image upload functionality, integration with the image generation model, and the "Generate Menu" button.

## Design

Open the review design files:

1. designs/photo-realistic-menu-generator.png
2. designs/photo-realistic-menu-generator*standalone*.html

Use these as a reference for implementing the user interface of the web app.

## Technology

1. Vite, React, TypeScript
2. Vitest for unit tests
3. Nano Banna (gemini-2.5-flash-image) https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image for image
   generation

## Starter Plan

1. Implement test suite with Vitest. Allow tests to fail initially to guide development and ensure that all features are
   properly tested as they are implemented.
2. Implement text input box for text-to-image generation
3. Implement image upload with drag and drop or icon to open file explorer for text-and-image-to-image generation
4. Integrate Nano Banna (gemini-2.5-flash-image) for image generation based on text input or uploaded image
5. Implement "Generate Menu" button to trigger image generation and display the generated graphical menu with text
   descriptions of each menu item
