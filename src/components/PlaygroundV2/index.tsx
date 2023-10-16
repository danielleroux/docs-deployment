/*
 * COPYRIGHT (c) Siemens AG 2018-2023 ALL RIGHTS RESERVED.
 */
import useBaseUrl from '@docusaurus/useBaseUrl';
import { IxIconButton, IxSpinner, IxTabItem, IxTabs } from '@siemens/ix-react';
import CodeBlock from '@theme/CodeBlock';
import { useEffect, useState } from 'react';
import { TargetFramework } from '../Playground/framework-types';
import Demo, { DemoProps } from './../Demo';
import styles from './styles.module.css';

type SourceFile = {
  filename: string;
  source: string;
};

function getBranchPath(framework: TargetFramework) {
  let path = 'html';

  if (framework === TargetFramework.ANGULAR) {
    path = 'angular';
  }

  if (framework === TargetFramework.REACT) {
    path = 'react';
  }

  if (framework === TargetFramework.VUE) {
    path = 'vue';
  }

  return `siemens/ix/tree/main/packages/${path}-test-app`;
}

function stripHeader(code: string) {
  return code
    .replace(/\/\*\s*\n([^\*]|\*[^\/])*\*\/(\n)+/g, '')
    .replace(/<!-.*SPD.*-->(\n)+/gms, '');
}

function sliceHtmlCode(code: string) {
  if (code.includes('<!-- Preview code -->')) {
    const [__, source] = code.split('<!-- Preview code -->\n');
    return stripHeader(
      source
        .split('\n')
        .map((line) => line.replace(/[ ]{4}/, ''))
        .join('\n')
        .trimEnd()
    );
  }

  return stripHeader(code);
}

async function fetchSource(path: string) {
  const response = await fetch(path);
  const source = await response.text();

  // Docusaurus don' throw a classic 404 if a sub route is not found
  // Check if the response is the bootstrap code of docusaurus
  // If this is the case the resource is not existing
  if (!source || source?.includes(`<div id="__docusaurus"></div>`)) {
    return null;
  }

  return source;
}

async function fetchHTMLSource(
  path: string,
  framework: TargetFramework,
  files: string[]
) {
  let frameworkPath = 'web-components';

  if (framework === TargetFramework.ANGULAR) {
    frameworkPath = 'angular';
  }

  if (framework === TargetFramework.REACT) {
    frameworkPath = 'react';
  }

  if (framework === TargetFramework.VUE) {
    frameworkPath = 'vue';
  }

  return Promise.all(
    files.map(async (file) => {
      try {
        const source = await fetchSource(`${path}/${frameworkPath}/${file}`);

        if (!source) {
          return null;
        }

        return {
          filename: file,
          source: sliceHtmlCode(source),
        };
      } catch (e) {
        console.warn(e);
      }
    })
  );
}

function getLanguage(filename: string) {
  if (filename.endsWith('.html')) {
    return 'html';
  }

  if (filename.endsWith('.ts')) {
    return 'ts';
  }

  if (filename.endsWith('.tsx')) {
    return 'tsx';
  }

  if (filename.endsWith('.vue')) {
    return 'tsx';
  }
}

type PlaygroundV2Props = {
  files: Record<TargetFramework, string[]>;
  examplesByName?: boolean;
} & DemoProps;

function SourceCodePreview(props: {
  framework: TargetFramework;
  name: string;
  files?: Record<TargetFramework, string[]>;
  examplesByName?: boolean;
}) {
  const [isFetching, setFetching] = useState(false);
  const baseUrl = useBaseUrl('/auto-generated');

  const [files, setFiles] = useState<SourceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<number>(0);

  useEffect(() => {
    console.log(props);
    if (props.examplesByName) {
      let filesToFetch = [];

      if (props.framework === TargetFramework.ANGULAR) {
        filesToFetch = [`${props.name}.ts`, `${props.name}.html`];
      }

      if (props.framework === TargetFramework.JAVASCRIPT) {
        filesToFetch = [`${props.name}.html`];
      }

      if (props.framework === TargetFramework.REACT) {
        filesToFetch = [`${props.name}.tsx`];
      }

      if (props.framework === TargetFramework.VUE) {
        filesToFetch = [`${props.name}.vue`];
      }

      fetchHTMLSource(baseUrl, props.framework, filesToFetch).then((files) =>
        setFiles(files.filter((f) => f))
      );
      return;
    }
    if (props.files && props.files[props.framework]) {
      const filesToFetch = props.files[props.framework];
      fetchHTMLSource(baseUrl, props.framework, filesToFetch).then((files) =>
        setFiles(files.filter((f) => f))
      );
    }
  }, [props.framework]);

  if (isFetching) {
    return <IxSpinner></IxSpinner>;
  }

  if (files.length === 0) {
    return (
      <div
        style={{
          padding: '1rem',
        }}
      >
        There is no example code yet 😱
      </div>
    );
  }

  if (files.length === 1) {
    return (
      <CodeBlock language={getLanguage(files[0].filename)}>
        {files[0].source}
      </CodeBlock>
    );
  }

  return (
    <>
      <IxTabs>
        {files.map((file, index) => (
          <IxTabItem
            key={file.filename + '.' + index}
            onClick={() => setSelectedFile(index)}
          >
            {file.filename}
          </IxTabItem>
        ))}
      </IxTabs>
      <CodeBlock language={getLanguage(files[selectedFile].filename)}>
        {files[selectedFile].source}
      </CodeBlock>
    </>
  );
}

export default function PlaygroundV2(props: PlaygroundV2Props) {
  const [tab, setTab] = useState<TargetFramework>(TargetFramework.PREVIEW);

  const baseUrlAssets = useBaseUrl('/img');

  return (
    <div>
      <IxTabs>
        <IxTabItem onClick={() => setTab(TargetFramework.PREVIEW)}>
          Preview
        </IxTabItem>
        <IxTabItem onClick={() => setTab(TargetFramework.ANGULAR)}>
          Angular
        </IxTabItem>
        <IxTabItem onClick={() => setTab(TargetFramework.REACT)}>
          React
        </IxTabItem>
        <IxTabItem onClick={() => setTab(TargetFramework.VUE)}>Vue</IxTabItem>
        <IxTabItem onClick={() => setTab(TargetFramework.JAVASCRIPT)}>
          Javascript
        </IxTabItem>

        <div className={styles.Files_Toolbar}>
          {tab === TargetFramework.PREVIEW ? (
            <IxIconButton ghost size="16" icon={`open-external`}></IxIconButton>
          ) : (
            <>
              <IxIconButton
                ghost
                size="16"
                icon={`${baseUrlAssets}/stackblitz.svg`}
                onClick={() => {
                  window.open(
                    `https://stackblitz.com/github/${getBranchPath(tab)}`
                  );
                }}
              ></IxIconButton>

              <IxIconButton
                ghost
                size="16"
                icon={`${baseUrlAssets}/github.svg`}
                onClick={() => {
                  window.open(`https://github.com/${getBranchPath(tab)}`);
                }}
              ></IxIconButton>
            </>
          )}
        </div>
      </IxTabs>
      {tab === TargetFramework.PREVIEW ? <Demo {...props}></Demo> : null}
      {tab !== TargetFramework.PREVIEW ? (
        <SourceCodePreview
          framework={tab}
          name={props.name}
          files={props.files}
          examplesByName={props.examplesByName}
        ></SourceCodePreview>
      ) : null}
    </div>
  );
}
