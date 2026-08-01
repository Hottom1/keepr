import LegalLayout from "./LegalLayout.jsx";

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" updated="August 1, 2026">
      <p>
        These terms cover your use of Keepr. By creating an account, you agree to them. They're written
        in plain language on purpose. If something's unclear, contact us before you rely on it.
      </p>

      <div>
        <h2 className="legal-h2">What Keepr is</h2>
        <p>Keepr is a training app for handball and beach handball goalkeepers: a drill library, a
        6-week training block builder, match stat tracking, and Kip, an AI coach that gives training
        suggestions based on your profile and activity in the app.</p>
      </div>

      <div>
        <h2 className="legal-h2">Your account</h2>
        <p>You're responsible for keeping your login details secure and for anything that happens
        under your account. Use a real email address you control, and let us know if you think your
        account's been compromised.</p>
      </div>

      <div>
        <h2 className="legal-h2">Acceptable use</h2>
        <p>Use Keepr for its intended purpose. Don't try to break, scrape, overload, or reverse-engineer
        the service; don't attempt to extract, abuse, or misuse Kip in ways unrelated to goalkeeper
        training; and don't use the app for anything illegal.</p>
      </div>

      <div>
        <h2 className="legal-h2">Kip isn't a medical or licensed coaching professional</h2>
        <p>Kip is an AI assistant, not a doctor, physiotherapist, or certified coach. Its advice is
        informational and based on the context you give it. It doesn't know your body, your history,
        or anything you haven't told it. Kip won't diagnose injuries or tell you to train through real
        pain, and neither should you: for anything beyond mild soreness or normal fatigue, see a
        physiotherapist or doctor before continuing to train. Training as a goalkeeper (diving,
        sliding, repeated impact) carries a real risk of injury regardless of what any app tells you.
        Use your judgment, warm up properly, and don't push through pain that doesn't feel normal.</p>
      </div>

      <div>
        <h2 className="legal-h2">Your content</h2>
        <p>Custom exercises, training blocks, match stats, and anything else you add to Keepr are
        yours. We store it to run the app and don't claim ownership of it. You're responsible for what
        you enter. Don't upload anything you don't have the right to share.</p>
      </div>

      <div>
        <h2 className="legal-h2">Availability</h2>
        <p>We aim to keep Keepr running reliably, but we don't guarantee uninterrupted access. Features
        that depend on third-party services (like Kip, which relies on Anthropic's API) may be
        unavailable if those services are down.</p>
      </div>

      <div>
        <h2 className="legal-h2">Termination</h2>
        <p>You can stop using Keepr and ask us to delete your account at any time. We may suspend or
        terminate accounts that violate these terms, including abusive use of Kip or the platform.</p>
      </div>

      <div>
        <h2 className="legal-h2">Disclaimer</h2>
        <p>Keepr is provided as-is, without warranties of any kind. We don't guarantee that any
        exercise, training block, or piece of advice from Kip is suitable for your specific physical
        condition. Physical training carries inherent risk of injury; consult a doctor before starting
        a new training programme, especially if you have an existing injury or medical condition. To
        the extent permitted by law, we're not liable for injuries or losses arising from your use of
        the app or from following training advice it provides.</p>
      </div>

      <div>
        <h2 className="legal-h2">Changes to these terms</h2>
        <p>If we make material changes, we'll update the date at the top of this page.</p>
      </div>

      <div>
        <h2 className="legal-h2">Contact</h2>
        <p>Questions about these terms: <b>hello@keepr.coach</b></p>
      </div>
    </LegalLayout>
  );
}
