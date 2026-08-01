import LegalLayout from "./LegalLayout.jsx";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 1, 2026">
      <p>
        Keepr is a training app for handball and beach handball goalkeepers. This page explains what
        information we collect, why, and what we do with it. We've tried to write it in plain language
        rather than boilerplate. If anything's unclear, use the contact details at the bottom.
      </p>

      <div>
        <h2 className="legal-h2">Information we collect</h2>
        <p><b>Account information:</b> your email address and password, handled by our authentication
        provider (Supabase). We never see or store your password in plain text.</p>
        <p className="mt-2"><b>Training profile:</b> anything you enter to personalise your training,
        including level, discipline, availability, equipment access, self-rated weaknesses, and any
        niggles or injuries you choose to log.</p>
        <p className="mt-2"><b>Training data:</b> the exercises you add, the training blocks you build,
        and the session logs (effort ratings, notes) you record.</p>
        <p className="mt-2"><b>Match stats:</b> matches you add and the shots you log against them
        (zone, outcome, shot type).</p>
        <p className="mt-2"><b>Kip conversations:</b> messages you send to and receive from Kip, our AI
        coach, stored so your conversation history persists between sessions.</p>
      </div>

      <div>
        <h2 className="legal-h2">How we use it</h2>
        <p>To run the app: save your library, plans, and stats; personalise Kip's coaching advice using
        your profile, current training block, and recent match data; and keep your account secure.
        We don't use your data for advertising, and we don't sell it to anyone.</p>
      </div>

      <div>
        <h2 className="legal-h2">Who else sees it</h2>
        <p>We use a small number of service providers to run Keepr, each of whom only sees what they
        need to do their job:</p>
        <p className="mt-2"><b>Supabase:</b> hosts our database and handles authentication. Your
        account and training data are stored here, protected by row-level security so that only your
        own signed-in session can read or write it.</p>
        <p className="mt-2"><b>Anthropic:</b> when you message Kip, that conversation (along with the
        relevant training context needed to make Kip's advice useful) is sent to Anthropic's API to
        generate a response. This request is routed through our own server-side function. Your
        message never carries your password or account credentials, and our API credentials never
        reach your browser.</p>
        <p className="mt-2"><b>Netlify:</b> hosts the application itself and the serverless function
        that talks to Anthropic.</p>
        <p className="mt-2">We don't share your data with anyone else, and we don't use third-party
        advertising or analytics trackers.</p>
      </div>

      <div>
        <h2 className="legal-h2">Cookies &amp; local storage</h2>
        <p>We use your browser's local storage to keep you signed in between visits (a session token,
        not a tracking cookie). We don't use third-party advertising cookies.</p>
      </div>

      <div>
        <h2 className="legal-h2">Data security</h2>
        <p>Your data is stored in a database protected by row-level security, meaning it's only
        accessible to your own authenticated account, not to other users, and not to us browsing
        the database casually. Passwords are hashed and managed entirely by our authentication
        provider; we never handle them directly.</p>
      </div>

      <div>
        <h2 className="legal-h2">Your rights</h2>
        <p>You can review and edit most of your data directly in the app. To export your data, delete
        your account, or ask us anything about what we hold on you, contact us using the details below
        and we'll action it.</p>
      </div>

      <div>
        <h2 className="legal-h2">Data retention</h2>
        <p>We keep your data for as long as your account is active. If you ask us to delete your
        account, we'll delete your associated data as well.</p>
      </div>

      <div>
        <h2 className="legal-h2">Children's privacy</h2>
        <p>Keepr isn't directed at children, and we don't knowingly collect information from young
        children without appropriate parental or guardian consent. If you believe a child has given us
        information without appropriate consent, contact us and we'll remove it.</p>
      </div>

      <div>
        <h2 className="legal-h2">Changes to this policy</h2>
        <p>If this policy changes in a material way, we'll update the date at the top of this page.</p>
      </div>

      <div>
        <h2 className="legal-h2">Contact</h2>
        <p>Questions about this policy or your data: <b>hello@keepr.coach</b></p>
      </div>
    </LegalLayout>
  );
}
