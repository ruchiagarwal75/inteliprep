import { LegalPage } from "@/components/legal-page";
export const metadata = { title: "Privacy policy | MockMeAI" };
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        MockMeAI provides AI system design interview practice. This policy
        describes the data used to run the private beta.
      </p>
      <h2>Your account and browser history</h2>
      <p>
        Google sign-in through Supabase provides your account ID, email and
        basic profile. Authentication cookies keep you signed in. Full saved
        interviews, whiteboard drawings, chat, feedback and unsent drafts are
        stored in this browser in an account-specific IndexedDB database.
        Signing out keeps that history on this device. It does not sync across
        devices.
      </p>
      <h2>Interview processing</h2>
      <p>
        The server uses Redis for the verified transcript, interview progress,
        timing, locks and cached feedback. Temporary interview state expires
        after two hours without activity. Rate-limit counters can remain for
        their daily limit window.
      </p>
      <p>
        To produce replies and feedback, we send the interview question, your
        messages, relevant transcript, diagram labels and connections, and an
        exported whiteboard image when available to OpenAI. Requests are sent
        from our server. OpenAI processes them under the API service terms and
        the project&apos;s data settings. See{" "}
        <a href="https://platform.openai.com/docs/guides/your-data">
          OpenAI&apos;s API data controls
        </a>
        .
      </p>
      <h2>Operational reporting and first visits</h2>
      <p>
        Our private admin database records account signup information, interview
        milestones, elapsed duration and outcome, selected feedback summaries,
        failure reference IDs, model token usage and estimated cost. It does not
        copy full answers, raw drawings or audio into reporting. These
        operational records remain until the operator removes them; they do not
        share Redis&apos;s two-hour expiry.
      </p>
      <p>
        A first-party random ID in localStorage lets us count a browser&apos;s
        first visit. We store a hash of that ID, its first-visit time,
        environment, an admin/test exclusion flag and an account reference when
        you are signed in. We do not store page trails or IP addresses for this
        metric. Another browser or cleared storage can count again. There is no
        session replay or third-party analytics integration.
      </p>
      <p>
        Server logs contain limited diagnostic metadata such as request IDs,
        error categories and code locations. We do not intentionally log
        secrets, chat answers, cookies, transcripts or raw audio. Hosting and
        infrastructure providers process requests and maintain their own
        operational logs under their terms.
      </p>
      <h2>Delete your data</h2>
      <p>
        Use Delete in practice history to remove a saved attempt from this
        browser. Clearing MockMeAI site data in your browser removes local
        history, drafts, sign-in cookies and the visitor ID. This does not
        delete account records, server reporting or copies already processed by
        providers.
      </p>
      <p>
        To request deletion of your Supabase account and associated server
        reporting, contact the person who invited you to the beta and provide
        the Google email you use with MockMeAI. The operator will verify your
        account before handling the request. Provider retention is governed by
        the applicable provider settings and policies.
      </p>
      <h2>Questions and changes</h2>
      <p>
        Contact the person who invited you with privacy questions. We will
        update this page when these practices change.
      </p>
    </LegalPage>
  );
}
