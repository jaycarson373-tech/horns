export default function Loading() {
  return <main className="route-page page-width" aria-busy="true" aria-label="Loading PumpXBT data"><div className="skeleton-title" /><div className="skeleton-toolbar" /><div className="skeleton-table">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div></main>;
}
