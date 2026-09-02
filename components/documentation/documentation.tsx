import styles from '../../app/docs/page.module.css';

const javaSnippet = `import io.promptv.Promptv;

var promptv = Promptv.builder()
    .apiKey(System.getenv("PROMPTV_API_KEY"))
    .build();

var prompt = promptv.prompts().get("support-reply");
var result = prompt.render(Map.of(
    "customer_name", "Maya",
    "issue", "Unable to reset password"
));`;

const apiSnippet = `curl https://api.promptv.dev/v1/prompts/support-reply/render \\
  -H "Authorization: Bearer $PROMPTV_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "variables": {
      "customer_name": "Maya",
      "issue": "Unable to reset password"
    }
  }'`;

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
              <li><strong>Add a prompt.</strong> Give it a clear name, content, and variables.</li>
              <li><strong>Test the output.</strong> Try realistic values before connecting your app.</li>
              <li><strong>Connect your client.</strong> Fetch and render the prompt at runtime.</li>
            </ol>
          </section>

          <section id="client-app">
            <p className={styles.sectionNumber}>03</p>
            <h2>Use Promptv in your client application</h2>
            <p>
              Your application asks Promptv for a named prompt, supplies its variables, and
              receives the final text ready for your AI provider. This keeps business logic in
              your app and prompt content easy for your team to improve.
            </p>
            <div className={styles.callout}>
              <span>Tip</span>
              <p>Never expose your Promptv API key in a browser. Make requests from your server or backend-for-frontend.</p>
            </div>
          </section>

          <section id="java">
            <p className={styles.sectionNumber}>04</p>
            <h2>Java quick start</h2>
            <p>Use the Java client in a Spring Boot service, a worker, or any JVM application.</p>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}><span>Example.java</span><span>Java</span></div>
              <pre><code>{javaSnippet}</code></pre>
            </div>
          </section>

          <section id="api">
            <p className={styles.sectionNumber}>05</p>
            <h2>API example</h2>
            <p>Every prompt can be rendered through the API using its stable name and a variables object.</p>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}><span>Render a prompt</span><span>cURL</span></div>
              <pre><code>{apiSnippet}</code></pre>
            </div>
          </section>
        </article>

        <aside className={styles.tableOfContents}>
          <p>On this page</p>
          <a href="#about">What is Promptv?</a>
          <a href="#quickstart">How to use it</a>
          <a href="#client-app">Client applications</a>
          <a href="#java">Java quick start</a>
          <a href="#api">API example</a>
        </aside>
      </div>
    </div>
  );
}
