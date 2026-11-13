import ResendReceiving from "../components/ResendReceiving";
import { Loading, PageHeader } from "../components/UI";

export default function Inbox({ settings, version, navigate }) {
  if (!settings) return <Loading />;
  return <>
    <PageHeader title="Inbox" description="Campaign replies, opt-outs, and messages needing review.">
      <button className="button secondary" onClick={() => navigate("settings")}>Receiving settings</button>
    </PageHeader>
    <ResendReceiving settings={settings} version={version} showConfiguration={false} />
  </>;
}
