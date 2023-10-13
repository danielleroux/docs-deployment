/*
 * COPYRIGHT (c) Siemens AG 2018-2023 ALL RIGHTS RESERVED.
 */
import fs from 'fs-extra';
import { Listr } from 'listr2';
import path from 'path';
import { pipeline } from 'stream/promises';
import yauzl from 'yauzl-promise';

const tempWorkingDirPath = path.join(__dirname, '.temp-examples');
const zipOutputPath = path.join(__dirname, '.temp-examples', 'output');

(async () => {
  // CommonJS Workaround
  const { execaCommand } = await import('execa');

  const branch = process.env.IX_DOCS_BRANCH;
  const file = path.join(tempWorkingDirPath, `ix-${branch}.zip`);

  const unpackFilter = [
    // 'vue-test-app',
    // 'react-test-app',
    // 'angular-test-app',
    // 'html-test-app',
    path.join('core', 'component-doc.json'),
  ];

  const tasks = new Listr(
    [
      // {
      //   title: `Download ${branch} examples`,
      //   task: async () => {
      //     await rimraf(tempWorkingDirPath);
      //     await fs.ensureDir(tempWorkingDirPath);
      //     await fs.ensureDir(zipOutputPath);

      //     const response = await fetch(
      //       'https://github.com/siemens/ix/archive/refs/heads/main.zip'
      //     );
      //     const fileStream = fs.createWriteStream(file, { flags: 'wx' });
      //     await finished(Readable.fromWeb(response.body!).pipe(fileStream));
      //   },
      // },
      {
        title: `Unpack`,
        task: async () => {
          const zip = await yauzl.open(file);
          try {
            //@ts-ignore
            for await (const entry of zip) {
              if (
                unpackFilter.some((testAppPath) =>
                  entry.filename.includes(testAppPath)
                )
              ) {
                // console.log();
                // if (entry.filename.endsWith('/')) {
                //   await fs.ensureDir(path.join(zipOutputPath, entry.filename));
                // } else {
                await fs.ensureDir(path.dirname(entry.filename));
                const readStream = await entry.openReadStream();
                const writeStream = fs.createWriteStream(
                  path.join(zipOutputPath, entry.filename)
                );
                await pipeline(readStream, writeStream);
                // }
              }
            }
          } finally {
            await zip.close();
          }
        },
      },
      // {
      //   title: 'Build Demos',
      //   task: async () => {
      //     const cwd = path.join(
      //       zipOutputPath,
      //       `ix-${branch}`,
      //       'packages',
      //       'html-test-app'
      //     );
      //     await execaCommand('pnpm install', {
      //       cwd,
      //     });
      //     await execaCommand('pnpm build', {
      //       cwd,
      //     });
      //   },
      // },
    ],
    { concurrent: false }
  );

  try {
    await tasks.run();
  } catch (e) {
    console.error(e);
  }
})();
