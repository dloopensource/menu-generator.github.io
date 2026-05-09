# menu-generator

Menu generator is a web app that allows users to create a graphical menu for their menu items. The menu can be created
by
filling out a form with the following fields:

* text-to-image: Text input box
* text-and-image-to-image: Image upload with drag and drop or file explorer e.g. opens Mac OS X finder

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
https://dloopensource.github.io/menu-generator.github.io
