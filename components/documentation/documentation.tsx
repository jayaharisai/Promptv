import styles from '../../app/docs/page.module.css';

const pythonSnippet = `import os

from promptv import Promptv, PromptvError

promptv = Promptv(api_key=os.environ["PROMPTV_API_KEY"])

for folder in promptv.list_folders():
    print(folder.name)

try:
    prompt = promptv.get_prompt("Support", "reply")
    print(prompt.content)
    print(f"Active version: {prompt.version}")
except PromptvError as error:
    print(error)`;

const apiSnippet = `curl http://localhost:8000/api/v1/sdk/prompts/Support/reply \\
  -H "Authorization: Bearer $PROMPTV_API_KEY" \\
  -H "Accept: application/json"`;

export function Documentation() {
  return (
    <div className={styles.content}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Documentation</p>
          <h1>Ship better prompts with confidence.</h1>
          <p className={styles.introduction}>
            Promptv is a shared home for the prompts your product depends on. Create, version,
            test, and deliver them to every client application from one place.
          </p>
        </div>
        <div className={styles.version}>v0.1 <span>Early access</span></div>
      </header>

      <div className={styles.documentationGrid}>
        <article className={styles.article}>
          <section id="about">
            <p className={styles.sectionNumber}>01</p>
            <h2>What is Promptv?</h2>
            <p>
              Promptv gives product and engineering teams a dependable way to manage AI
              instructions. Instead of keeping prompts inside application code, keep them in a
              workspace where changes are visible, reviewable, and ready to use.
            </p>
            <div className={styles.featureGrid}>
              <div>
                <span className={styles.featureIndex}>A</span>
                <h3>One source of truth</h3>
                <p>Keep each production prompt, its variables, and its history together.</p>
              </div>
              <div>
                <span className={styles.featureIndex}>B</span>
                <h3>Designed for teams</h3>
                <p>Make updates without losing context on why a prompt changed.</p>
              </div>
            </div>
          </section>

          <section id="quickstart">
            <p className={styles.sectionNumber}>02</p>
            <h2>How to use it</h2>
            <p>Start with a workspace, then turn a repeatable instruction into a prompt.</p>
            <ol className={styles.steps}>
              <li><strong>Create a workspace.</strong> Use a workspace for each product or team.</li>
              <li><strong>Add a prompt.</strong> Give it a clear name and content.</li>
              <li><strong>Publish a version.</strong> Select the active version your application should receive.</li>
              <li><strong>Connect your client.</strong> Create an access key and fetch the active prompt at runtime.</li>
            </ol>
          </section>

          <section id="client-app">
            <p className={styles.sectionNumber}>03</p>
            <h2>Use Promptv in your client application</h2>
            <p>
              Create an access key in the Access Keys page, then use it from your server to list
              folders and fetch a named prompt. Promptv returns the selected active version, so
              your team can update prompt content without changing application code.
            </p>
            <div className={styles.callout}>
              <span>Tip</span>
              <p>Never expose your Promptv API key in a browser. Make requests from your server or backend-for-frontend.</p>
            </div>
          </section>

          <section id="python">
            <p className={styles.sectionNumber}>04</p>
            <h2>Python quick start</h2>
            <p>
              Install the SDK with <code>pip install "git+https://github.com/jayaharisai/Promptv.git#subdirectory=sdk/python"</code>,
              set your <code> PROMPTV_API_KEY</code> environment variable, and use it in any
              Python server or worker.
            </p>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}><span>example.py</span><span>Python</span></div>
              <pre><code>{pythonSnippet}</code></pre>
            </div>
          </section>

          <section id="api">
            <p className={styles.sectionNumber}>05</p>
            <h2>API example</h2>
            <p>
              The SDK uses this read-only endpoint under the hood. It returns a prompt only when
              it is published and has an active version. You can also send the key in the
              <code> X-API-Key</code> header.
            </p>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}><span>Get an active prompt</span><span>cURL</span></div>
              <pre><code>{apiSnippet}</code></pre>
            </div>
          </section>
        </article>

        <aside className={styles.tableOfContents}>
          <p>On this page</p>
          <a href="#about">What is Promptv?</a>
          <a href="#quickstart">How to use it</a>
          <a href="#client-app">Client applications</a>
          <a href="#python">Python quick start</a>
          <a href="#api">API example</a>
        </aside>
      </div>
    </div>
  );
}
