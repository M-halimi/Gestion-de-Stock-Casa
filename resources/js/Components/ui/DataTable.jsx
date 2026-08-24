import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import Pagination from './Pagination';

export default function DataTable({ columns = [], rows = [], empty = {}, actions, actionsLabel }) {
    const { t } = useTranslation();
    return (
        <div className="overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-1">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-hairline">
                    <thead className="bg-canvas-soft">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className={`px-5 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute ${col.className ?? ''}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                            {actions && (
                                <th scope="col" className="px-5 py-3 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                    {actionsLabel ?? t('common.actions')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline bg-canvas">
                        {rows.length > 0 ? (
                            rows.map((row, i) => (
                                <tr key={row.key ?? i} className="transition hover:bg-canvas-soft">
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`px-5 py-3 text-[14px] text-ink-secondary ${col.cellClass ?? ''} ${
                                                col.tabular ? 'tabular' : ''
                                            }`}
                                        >
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-5 py-3 text-end">
                                            {actions(row)}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)}>
                                    <EmptyState
                                        title={empty.title ?? 'Aucun résultat'}
                                        description={empty.description}
                                        action={empty.action}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {empty.pagination && <Pagination meta={empty.pagination} />}
        </div>
    );
}
