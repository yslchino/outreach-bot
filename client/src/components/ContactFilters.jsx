import { useResource } from "../hooks";

export default function ContactFilters({ region, state, industry, onChange, version = 0, prefix = "Lead" }) {
  const { data, error, reload } = useResource("/contacts/facets", version);
  const states = region && region !== "__missing__" ? data?.statesByRegion?.[region] || [] : data?.states || [];
  return (
    <div className="geography-filters">
      <select aria-label={prefix + " region"} value={region} onChange={event => onChange({ region: event.target.value, state: "", industry })}>
        <option value="">All regions</option>
        {(data?.regions || []).map(value => <option key={value} value={value}>{value}</option>)}
        <option value="__missing__">Missing region</option>
      </select>
      <select aria-label={prefix + " state"} value={state} onChange={event => onChange({ region, state: event.target.value, industry })}>
        <option value="">All states</option>
        {states.map(value => <option key={value} value={value}>{value}</option>)}
        <option value="__missing__">Missing state</option>
      </select>
      <select aria-label={prefix + " industry"} value={industry} onChange={event => onChange({ region, state, industry: event.target.value })}>
        <option value="">All industries</option>
        {(data?.industries || []).map(value => <option key={value} value={value}>{value}</option>)}
        <option value="__missing__">Missing industry</option>
      </select>
      {error && <button type="button" className="text-button" onClick={reload}>Retry filter options</button>}
    </div>
  );
}
