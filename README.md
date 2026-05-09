# menu-generator

Menu generator is a web app that allows users to create a graphical menu for each menu item(s). The graphical menu can
be created by using the following fields:

* text-to-image: Text input box to enter a description of the menu item(s) (e.g. "a burger with fries and a soda").
* text-and-image-to-image: Image upload with drag and drop or icon to open file explorer (e.g. opens Mac OS X finder) to
  select an image from the user's device with the menu item(s).

If the user uploads an im/age, the web app will use the image as a reference for the menu item(s). Otherwise, the web
app will then generate a menu item(s) based on the text input.

User will then click the "Generate Menu" button to generate the graphical menu with the text descriptions of each menu
item.

## Generator models

* Nano Banna (gemini-2.5-flash-image) https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image

## Deployment

### Deploying latest

NOTE: Do not commit directly to the `main` branch as this is the production branch for github pages.

Run the following to deploy the latest changes to production:

```
git checkout develop
npm run deploy
```

Your site will be built and deployed using the latest `main` branch. This is served by GitHub Pages at
https://dloopensource.github.io/menu-generator.github.io/

## Technologies used

* Vite, React, TypeScript: https://vite.dev/guide/
* Testing: Vitest for unit tests
