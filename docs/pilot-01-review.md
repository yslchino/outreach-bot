# Washington manufacturers — Pilot 01 review

Reviewed November 6, 2026 (America/Los_Angeles) against the local development database and current code. Review only: campaign and all 10 messages remain drafts, with no recipient or content edits. No external company research or independent mailbox verification was performed.

## Sending blockers

- All 10 recipients retain permission business_contact, not opted_in. The owner reports Resend approved this outreach by phone. RESEND_OUTREACH_APPROVED=true records that account-specific approval locally; the setting defaults to false elsewhere. No written confirmation was reviewed. The policy permits business_contact only with that explicit approval and preserves other eligibility checks.
- POSTAL_ADDRESS is empty. Existing sending configuration and policy require it before campaign sending.
- EMAIL_PROVIDER is disabled; SENDING_ENABLED, JOBS_ENABLED, and AI_ENABLED remain false. These remain off pending a separate authorized launch.
- Receiving currently depends on a temporary PC-hosted tunnel. A continuously available receiving endpoint and operational checks remain outstanding.

## Recipient review

All 10 records are WA / Manufacturing in the imported workbook, have unique recipient addresses, are marked emailVerified using user_reported verification, have permission business_contact, and currently have no recorded reply or suppression. These fields describe stored data; they do not establish current employment, freight responsibility, deliverability, or consent. All job titles and cities are blank.

Source: All_Shippers_Categorized_by_Region_and_State_FIXED.xlsx, Sheet1.

| Company | Contact | Draft recipient | Source row |
|---|---|---|---|
| Aaron Packaging | Joseph Astle | joe@aaronpackaging.com | 275 |
| Johanna Beverage | Heather Janke | hjanke@johannabeverage.com | 701 |
| Northwest Naturals | Shelley Larkin | shelleyl@nwnaturals.com | 722 |
| Northwest Precast | Luke Berg | luke.berg@nw-precast.com | 793 |
| Fat Daddio | Jon Norwood | jnorwood@fatdaddios.com | 842 |
| JEMCO Components and Fabrication | Derek Bodine | dbodine@jemcoinc.com | 971 |
| Kompan | Mike Mayer | mikmay@kompan.com | 571 |
| Creations Foods | David Henry | david.henry@creationsfoods.com | 572 |
| HydroPeptide | Leandro Avila | leandroa@hydropeptide.com | 1015 |
| AFL Hyperscale | Christian Stone | chris.stone@aflhyperscale.com | 1187 |

Confirm the company display names, particularly “Fat Daddio,” before final copy approval. Freight needs, equipment, lanes, and recipient responsibilities have not been established. Avoid inventing those details.

## Copy review

The 10 drafts share the same structure with a first name, company, and company-specific subject. Subjects clearly ask for the freight contact. Copy identifies Erick and GET Logistics, avoids unsupported capacity/rate claims, and offers removal by reply.

The body asks who handles freight, asks about a shipment or lane, requests a meeting time, and asks for a referral. A shorter first contact with one main question would be easier to answer. “Co-founder” appears throughout; confirm this title before final approval.

Proposed wording for discussion only; not applied to the database:

> Subject: Freight contact at [Company]
>
> Hi [First name],
>
> I’m Erick Hernandez with GET Logistics LLC. Are you the right person to contact about freight transportation at [Company]?
>
> If you work with outside freight brokers, I’d be glad to introduce our business. If someone else handles freight, could you point me in the right direction?
>
> Best,
> Erick Hernandez
> GET Logistics LLC

The normal mailer appends GET Logistics LLC, the configured postal address, and “To stop receiving messages, reply with unsubscribe,” plus a List-Unsubscribe mailto header. The existing draft also includes a removal sentence, so review the final rendered message to avoid repeating the opt-out footer. Do not apply placeholders as a real postal address.

## Next decisions

1. Provider approval is recorded from the owner’s confirmation; preserve business_contact records and review approval scope again if the account or audience changes.
2. Supply the business postal address and confirm sender title/company display names.
3. Confirm current recipient roles and approve revised copy before editing drafts.
4. Prepare permanent receiving infrastructure as a separate reviewable task; no deployment is authorized by this review.
5. Recheck suppression, reply state, eligibility, rendered content, and limits before any separately authorized batch.

## Checks performed

Read all 10 message bodies and their linked contact records; checked current policy and mailer; confirmed no pilot recipient suppression, 10 unchanged drafts, 1,200 business_contact records, and disabled sending/jobs/AI. Live internal reply and opt-out results are recorded in [receiving documentation](resend-receiving.md). The original review changed documentation only. A subsequent change adds the explicit Resend approval configuration and eligibility tests; see the receiving documentation.
