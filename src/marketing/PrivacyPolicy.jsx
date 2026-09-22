import LegalLayout from "./LegalLayout.jsx";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 22, 2026">
      <div>
        <h2 className="legal-h2">Who we are</h2>
        <p>Keepr is a training app for handball and beach handball goalkeepers, operated by Thomas Roxburgh,
        based in South Street, Edgecliff, Sydney, New South Wales, Australia.
        Contact: hello@keepr.coach.</p>
      </div>

      <div>
        <h2 className="legal-h2">Minimum age: 16+</h2>
        <p>You must be at least 16 years old to create a Keepr account. By creating an account you confirm
        that you are. We don't currently ask for your date of birth or otherwise verify your age.</p>
      </div>

      <div>
        <h2 className="legal-h2">What we collect</h2>
        <p><b>Account information:</b> your email address and password (stored securely by our
        authentication provider, never in plain text).</p>
        <p className="mt-2"><b>Profile information (from Kip onboarding):</b> your playing level, discipline
        (indoor/beach), season phase, weekly availability, equipment access, self-rated weaknesses, and
        niggles/injuries you choose to report (body part, severity, whether cleared by a physio). This last
        category is health-adjacent — see the dedicated section below.</p>
        <p className="mt-2"><b>Training data:</b> exercises you log, training blocks you build, session
        completion, effort ratings (RPE), process goals, and reps/weight for gym exercises.</p>
        <p className="mt-2"><b>Match data:</b> opponents, results, and shot-by-shot logs you record (zone,
        outcome, shot type, position on court, range), plus any match video you upload.</p>
        <p className="mt-2"><b>Uploaded files:</b> PT/physio plans and match videos you choose to upload,
        stored in our database provider's file storage.</p>
        <p className="mt-2"><b>Teammate connections:</b> if you connect with a teammate using an invite
        code, and they record a training session or match "for" you, the match data they log (shots,
        outcomes, zones) is written into your account, visible to you the same as data you logged
        yourself. The connection requires both of you to accept it, and either person can revoke it at any
        time — revoking stops future data-sharing but doesn't remove matches already recorded while it was
        active. Connected teammates can see each other's email address. We don't share your broader profile,
        training plans, or other personal information with a connected teammate beyond what they record
        during a shared recording session.</p>
        <p className="mt-2"><b>Coach-sharing:</b> if you add a coach's email address to share reports, we
        first email them an invitation, and we don't send them anything else unless they confirm. Once they
        have, we email them a digest. You choose whether it includes training logs, match stats and attendance, but
        it is written from your whole Keepr profile, so it can also mention any niggles or injuries you've
        logged (body part, severity, whether a physio has cleared it, recent rehab notes), your rehab plan
        and rehab sessions, and your gender. There is no separate switch for those. The coach does not
        need a Keepr account. We store their email address in your profile, and in the record of each
        digest kept in your Reports, only to send and show what you've requested; removing the coach stops
        future digests. Every digest says which Keepr account it came from and includes a link that lets
        the coach stop all Keepr coach emails to their address; if they use it, we keep that address on a
        do-not-email list so no Keepr account can email them again.</p>
        <p className="mt-2"><b>Forwarded emails:</b> if you use your Keepr forwarding address for match or
        training schedules, we process the emails you send to it. We keep only the calendar details we
        extract (title, date, time, location) and the email's subject line, for you to review, and not the
        rest of the email.</p>
        <p className="mt-2"><b>Kip conversations:</b> your chat messages with Kip, and the profile/plan/stats
        context used to generate its responses, are sent to our AI provider, Anthropic, to generate a
        reply. See "AI processing" below.</p>
        <p className="mt-2"><b>Payment information:</b> Keepr does not currently process payments — the app
        is free to use. If a paid subscription is introduced in future, this section will be updated to
        name the payment processor and clarify that Keepr itself never receives or stores your card
        details.</p>
      </div>

      <div>
        <h2 className="legal-h2">Health-adjacent data — handled with extra care</h2>
        <p>Injury/niggle information and any uploaded PT/physio plans are sensitive. We:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Never use this data to diagnose anything, and neither does Kip — Kip is explicitly
          instructed never to diagnose a condition and to direct you to a real physio or doctor for
          anything beyond mild soreness.</li>
          <li>Include this data in what's sent to Anthropic when it's relevant: in Kip conversations (for
          example, Kip adjusting a session around a reported niggle), in PT/physio documents you ask Kip to
          read, and in the emails Kip writes for you and, if you use coach sharing, for your coach — see
          "AI processing" for how Anthropic handles that data.</li>
          <li>Include it in your coach's digest if you set up coach sharing (see "What we collect"). That
          and Anthropic are the only places it goes outside your own account.</li>
          <li>Do not include this data in any public-facing profile or sharing feature. No such feature
          exists today, and if one is ever introduced it will be built so that this data is left out by
          design.</li>
        </ul>
      </div>

      <div>
        <h2 className="legal-h2">AI processing (Kip and shot detection)</h2>
        <p>Kip's conversations, PT/physio and schedule documents you ask Kip to read, video frames analyzed
        for AI-assisted match shot detection, the text of emails you forward to your Keepr address, and the
        emails Kip writes for you and your coach are processed by Anthropic via their commercial API,
        accessed directly (not through a third-party platform or reseller). Video frames can show people on
        the court.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Content sent through Anthropic's commercial API is not used to train their models, under
          their published commercial terms.</li>
          <li>Anthropic's Data Processing Agreement, including Standard Contractual Clauses, is
          automatically incorporated into their Commercial Terms of Service — accepting those terms
          (required to use their API at all) means the DPA is in effect without a separate signing step. Keepr
          has accepted those terms, so this is already in effect.</li>
          <li>Anthropic retains API content only briefly and only as technically necessary to provide the
          service, under their standard commercial data handling terms current at the time of use — check
          their published terms directly for the exact current figure, since it's periodically
          updated.</li>
        </ul>
      </div>

      <div>
        <h2 className="legal-h2">Who we share data with</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Our database and storage provider (Supabase) — hosts our database, authentication, and file
          storage, in an Australian data region. Our provider's own infrastructure sub-processors may also
          process data as part of delivering the service. See "International data transfers" below for how
          we handle sending data like this outside the EEA or UK.</li>
          <li>Our hosting provider (Netlify) — hosts the app and its backend functions.</li>
          <li>Anthropic — see "AI processing" above.</li>
          <li>Our email provider (ImprovMX) — sends emails on our behalf (Kip check-ins, coach-shared
          reports) and receives the emails you forward to your Keepr address, including attachments,
          before passing them to us.</li>
          <li>YouTube (Google) — only if you add a YouTube link to a match: Keepr then embeds the YouTube
          player, and Google receives your IP address and browser details and may set its own cookies.</li>
          <li>Your coach, if you set up coach sharing — see "What we collect".</li>
        </ul>
        <p className="mt-2">We do not sell your data, and we do not use it for advertising.</p>
      </div>

      <div>
        <h2 className="legal-h2">International data transfers</h2>
        <p>As a global website, we may transfer, store, and process your personal data outside of your home
        jurisdiction. If you are located in the European Economic Area (EEA) or the United Kingdom (UK), this
        means your personal data may be transferred to countries that have not been granted an adequacy
        decision by the European Commission or the UK Government.</p>
        <p className="mt-2">Whenever we transfer your personal data out of the EEA or the UK, we ensure a
        similar degree of protection is afforded to it by ensuring at least one of the following legal
        safeguards is implemented:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><b>Adequacy decisions:</b> we only transfer your personal data to countries that have been
          deemed to provide an adequate level of protection for personal data.</li>
          <li><b>Standard contracts:</b> where we use certain service providers, we may use specific
          Standard Contractual Clauses (SCCs) approved by the European Commission, alongside the UK
          International Data Transfer Agreement (IDTA) or Addendum, which give personal data the same
          protection it has in Europe and the UK.</li>
          <li><b>Data Privacy Framework:</b> where vendors are located in the United States, we may transfer
          data to them if they are part of the EU-U.S. Data Privacy Framework (and the UK Extension).</li>
        </ul>
        <p className="mt-2">Please contact us if you want further information on the specific mechanism used
        by us when transferring your personal data out of the EEA or the UK.</p>
      </div>

      <div>
        <h2 className="legal-h2">Your rights</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>If you're in the EU or UK, GDPR gives you the right to access, correct, export, and delete
          your personal data, and to object to certain processing.</li>
          <li>If you're in Australia, the Australian Privacy Principles don't currently apply to Keepr as a
          small business under the Privacy Act's AUD $3 million turnover exemption. Regardless of this
          exemption, we extend the same access, correction, and deletion rights to all
          users as a matter of practice.</li>
          <li>If you're in California, the CCPA gives you the right to know what's collected about you and
          to request deletion. Since we don't sell personal data, the right to opt out of sale doesn't
          apply — there's nothing to opt out of.</li>
        </ul>
        <p className="mt-2">To exercise any of these rights, email hello@keepr.coach with your request.
        We'll verify your identity (to protect against someone else requesting your data) and respond
        within 30 days.</p>
      </div>

      <div>
        <h2 className="legal-h2">Data retention</h2>
        <p>We retain your data for as long as your account is active. To delete your account, email
        hello@keepr.coach; once we've confirmed the request is yours, we delete your personal data,
        training and match data, and uploaded files within 30 days, except where we're
        required to retain limited records for legal or accounting purposes (for example, transaction
        records once payments exist). Backups that include deleted data are retained only as long as our
        standard backup rotation period and are not separately restored or accessed after that point.</p>
      </div>

      <div>
        <h2 className="legal-h2">Cookies and tracking</h2>
        <p>Keepr does not use advertising or analytics tracking cookies. We use only what's strictly
        necessary for the app to function, such as keeping you logged in. The one exception is a YouTube
        embed: if you add a YouTube link to a match and play it, YouTube may set its own cookies.</p>
      </div>

      <div>
        <h2 className="legal-h2">Changes to this policy</h2>
        <p>We'll notify you of material changes to this policy by email to the address on your account, and by
        updating the date at the top of this page, before the changes take effect.</p>
      </div>

      <div>
        <h2 className="legal-h2">Contact</h2>
        <p><b>hello@keepr.coach</b></p>
      </div>
    </LegalLayout>
  );
}
