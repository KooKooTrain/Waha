import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CONTACT, PageHeader } from '../ui/Layout';

const UPDATED = '3 October 2026';

export function Privacy() {
  return (
    <LegalPage overline="Privacy Policy" title="What we keep, and why" intro="Short version: no accounts, no tracking, and only what you choose to report.">
      <Block title="What we collect">
        When you file a report we store the pin you dropped, the type you picked, what you wrote and the role you were viewing as.
        There are no names, no sign-in and no accounts. Please don’t put personal details about anyone in a report.
      </Block>
      <Block title="Where it lives">
        Reports are saved in your browser and on the Waha server for this prototype, so they can show up on the shared map.
        The assumptions you tweak and the role you pick stay in your browser only.
      </Block>
      <Block title="Other services">
        Map tiles load from OpenStreetMap and fonts load from Google Fonts. Like any website visit, those servers see your IP address.
        We don’t run analytics, ads or tracking cookies.
      </Block>
      <Block title="Removing your data">
        Clearing this site’s data in your browser deletes the local copy. To have a report taken off the server, get in touch below.
      </Block>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage overline="Terms and Conditions" title="Using Waha" intro="Waha is a hackathon prototype. Here’s what that means for you.">
      <Block title="Estimates, not readings">
        Every figure is modelled from public data and the assumptions listed on the <Link to="/methodology" className="font-semibold text-[#08628c] hover:text-[#193c4b]">methodology</Link> page.
        They aren’t meter readings or engineering advice. Get a proper site survey before you design, buy or sign off on anything.
      </Block>
      <Block title="Reports">
        Keep reports honest and about water. Don’t include personal details about other people. Reports can be edited, merged or removed during review.
      </Block>
      <Block title="Map and data">
        Map data and building outlines are © OpenStreetMap contributors, shared under the Open Database License. Other sources are credited on the methodology page.
      </Block>
      <Block title="No guarantees">
        Waha is provided as is. It can change, break or go offline at any time, and we can’t be held responsible for decisions made from its numbers.
      </Block>
    </LegalPage>
  );
}

function LegalPage({ overline, title, intro, children }: { overline: string; title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <PageHeader overline={overline} title={title} intro={intro} />
      <main className="mx-auto max-w-[1180px] px-4 pb-24 sm:px-6">
        <article className="waha-panel flex max-w-[780px] flex-col gap-7 rounded-[28px] p-7 sm:p-10">
          {children}
          <Block title="Contact">
            Questions or requests: <a href={`mailto:${CONTACT.email}`} className="font-semibold text-[#08628c] hover:text-[#193c4b]">{CONTACT.email}</a> or{' '}
            <a href={`tel:${CONTACT.phone}`} className="font-semibold text-[#08628c] hover:text-[#193c4b]">{CONTACT.phoneShown}</a>.
          </Block>
          <p className="m-0 border-t border-[#dce6ea] pt-5 text-xs text-[#66777e]">Last updated {UPDATED}</p>
        </article>
      </main>
    </>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 font-display text-xl font-bold tracking-[-0.035em]">{title}</h2>
      <p className="m-0 max-w-[68ch] text-[15px] leading-relaxed text-[#4d6370]">{children}</p>
    </section>
  );
}
