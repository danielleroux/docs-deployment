/*
 * COPYRIGHT (c) Siemens AG 2018-2023 ALL RIGHTS RESERVED.
 */
import fs from 'fs-extra';
import { Listr } from 'listr2';
import path from 'path';
import { escapeMarkdown } from 'utils';

const branch = process.env.IX_DOCS_BRANCH ?? 'main';

const examplePath = path.join(
  __dirname,
  '.temp-examples',
  'output',
  `ix-${branch}`,
  'packages'
);

const htmlTestAppPath = path.join(
  examplePath,
  'html-test-app',
  'src',
  'preview-examples'
);

const reactTextAppPath = path.join(
  examplePath,
  'react-test-app',
  'src',
  'preview-examples'
);

const angularTextAppPath = path.join(
  examplePath,
  'angular-test-app',
  'src',
  'preview-examples'
);

const vueTextAppPath = path.join(
  examplePath,
  'vue-test-app',
  'src',
  'preview-examples'
);

const docsPath = path.join(__dirname, 'docs', 'auto-generated');
const docsExampleWebComponentPath = path.join(
  __dirname,
  'docs',
  'auto-generated',
  'web-component'
);

const docsExampleReactPath = path.join(
  __dirname,
  'docs',
  'auto-generated',
  'react'
);

const docsExampleAngularPath = path.join(
  __dirname,
  'docs',
  'auto-generated',
  'angular'
);

const docsGenerationPath = path.join(__dirname, 'docs', 'auto-generated');

interface Context {
  names: string[];
  htmlExamples: string[];
  reactExamples: string[];
  angularExamples: string[];
  vueExamples: string[];
}

const tasks = new Listr<Context>(
  [
    {
      title: 'Setup',
      task: async () => {
        await fs.ensureDir(docsPath);
        await fs.ensureDir(docsExampleWebComponentPath);
        await fs.ensureDir(docsExampleReactPath);
        await fs.ensureDir(docsExampleAngularPath);
      },
    },
    {
      title: `Collecting html examples`,
      task: async (ctx, task) => {
        const examples = fs
          .readdirSync(htmlTestAppPath)
          .filter((name) => name.endsWith('.html'));

        ctx.names = examples.map((name) =>
          name.substring(0, name.indexOf('.html'))
        );
        ctx.htmlExamples = examples;
      },
    },
    {
      title: `Collecting react examples`,
      task: async (ctx, task) => {
        const examples = fs
          .readdirSync(reactTextAppPath)
          .filter((name) => name.endsWith('.tsx'));

        ctx.reactExamples = examples;
      },
    },
    {
      title: `Collecting angular examples`,
      task: async (ctx, task) => {
        const examples = fs
          .readdirSync(angularTextAppPath)
          .filter((name) => name.endsWith('.ts') || name.endsWith('.html'));

        ctx.angularExamples = examples;
      },
    },
    {
      title: `Collecting vue examples`,
      task: async (ctx, task) => {
        const examples = fs
          .readdirSync(vueTextAppPath)
          .filter((name) => name.endsWith('.vue'));

        ctx.vueExamples = examples;
      },
    },
    {
      title: `Write html examples`,
      task: async (ctx, task) => {
        const examples = ctx.htmlExamples;

        examples.map(async (example, index) => {
          const rawSource = await getRawStingContent(
            path.join(htmlTestAppPath, example)
          );
          let formattedSource = rawSource;

          if (rawSource.includes('<!-- Preview code -->')) {
            const [__, source] = rawSource.split('<!-- Preview code -->');
            formattedSource = source
              .split('\n')
              .map((line) => line.replace(/[ ]{4}/, ''))
              .join('\n')
              .trimEnd();
          }

          return fs.writeFile(
            path.join(docsExampleWebComponentPath, `${ctx.names[index]}.md`),
            wrap(`${formattedSource}`, 'html', 0)
          );
        });

        await Promise.all(examples);
      },
    },
    {
      title: `Write react examples`,
      task: async (ctx, task) => {
        const examples = ctx.reactExamples;

        examples.map(async (example, index) => {
          const rawSource = await getRawStingContent(
            path.join(reactTextAppPath, example)
          );
          return fs.writeFile(
            path.join(docsExampleReactPath, `${ctx.names[index]}.md`),
            wrap(rawSource, 'tsx')
          );
        });

        await Promise.all(examples);
      },
    },
    {
      title: `Write angular examples`,
      task: async (ctx, task) => {
        const examples = ctx.angularExamples;

        examples.map(async (example, index) => {
          if (example.endsWith('.html')) {
            const rawSource = await getRawStingContent(
              path.join(angularTextAppPath, example)
            );

            return fs.writeFile(
              path.join(docsExampleAngularPath, `${example}.md`),
              wrap(rawSource, 'html')
            );
          }

          if (example.endsWith('.ts')) {
            const rawSource = await getRawStingContent(
              path.join(angularTextAppPath, example)
            );

            return fs.writeFile(
              path.join(docsExampleAngularPath, `${example}.md`),
              wrap(rawSource, 'ts')
            );
          }
        });

        await Promise.all(examples);
      },
    },
  ],
  { concurrent: false }
);

(async () => {
  try {
    await tasks.run();
  } catch (e) {
    console.error(e);
  }
})();

async function getRawStingContent(path: string) {
  const response = await fs.readFile(path);
  return response.toString();
}

/**
 * Wrap source code inside markdown
 */
function wrap(
  content: string,
  language: 'html' | 'tsx' | 'ts',
  newLinesStart = 1
) {
  const markdownHeader = `<!--
SPDX-FileCopyrightText: 2023 Siemens AG

SPDX-License-Identifier: MIT
-->`;

  return `${markdownHeader}\n\n\`\`\`${language}${Array.from({
    length: newLinesStart,
  })
    .map(() => '\n')
    .join('')}${escapeMarkdown(content)}\n\`\`\``;
}
