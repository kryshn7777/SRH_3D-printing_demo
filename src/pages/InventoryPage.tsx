import React, { useState } from 'react';
import { Boxes, Minus, Plus, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  ALL_MATERIALS,
  InventoryCategory,
  InventoryItem,
  SupportedMaterial,
} from '../types/models';

const TABS: { key: InventoryCategory; label: string }[] = [
  { key: 'FILAMENT', label: 'Filament' },
  { key: 'SPARE_PART', label: 'Spare Parts & Consumables' },
];

function stockStatus(item: InventoryItem): 'OUT' | 'LOW' | 'OK' {
  if (item.quantity === 0) return 'OUT';
  return item.quantity <= item.lowStockThreshold ? 'LOW' : 'OK';
}

const StockBadge: React.FC<{ item: InventoryItem }> = ({ item }) => {
  const s = stockStatus(item);
  const cls =
    s === 'OUT'
      ? 'bg-red-100 text-red-700 border-red-200'
      : s === 'LOW'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${cls}`}>
      {s === 'OUT' ? 'Out of stock' : s === 'LOW' ? 'Low stock' : 'In stock'}
    </span>
  );
};

export const InventoryPage: React.FC = () => {
  const {
    currentUser,
    inventory,
    isLive,
    switchRoleUser,
    addInventoryItem,
    setInventoryQuantity,
    removeInventoryItem,
  } = useApp();

  const [tab, setTab] = useState<InventoryCategory>('FILAMENT');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<InventoryItem | null>(null);

  const [material, setMaterial] = useState<SupportedMaterial>('PLA');
  const [colour, setColour] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [threshold, setThreshold] = useState('1');

  const canEdit = currentUser?.role === 'LAB_INCHARGE';
  const items = inventory.filter((i) => i.category === tab);
  const lowCount = inventory.filter((i) => stockStatus(i) === 'LOW').length;
  const outCount = inventory.filter((i) => stockStatus(i) === 'OUT').length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const isFilament = tab === 'FILAMENT';
    if (isFilament && !colour.trim()) {
      setError('Colour is required for filament.');
      return;
    }
    const res = await addInventoryItem({
      category: tab,
      name: isFilament ? `${material} — ${colour.trim()}` : name.trim(),
      material: isFilament ? material : undefined,
      quantity: Number(quantity),
      unit: isFilament ? 'spools' : 'pcs',
      lowStockThreshold: Number(threshold),
    });
    if (!res.ok) {
      setError(res.error || 'Could not add item.');
      return;
    }
    setColour('');
    setName('');
    setQuantity('1');
    setThreshold('1');
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Inventory is read-only. Sign in as the Lab In-Charge to update stock.</span>
          </div>
          {!isLive && (
          <button
            type="button"
            onClick={() => switchRoleUser('USR-LAB-01')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
          >
            Switch to Lab In-Charge
          </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lab Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track filament and spare parts. Quantities save as you change them.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {tab === 'FILAMENT' ? 'Filament' : 'Item'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Tracked items', value: inventory.length, icon: Boxes, tone: 'bg-blue-50 text-[#1662F3]' },
          { label: 'Low stock', value: lowCount, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' },
          { label: 'Out of stock', value: outCount, icon: AlertTriangle, tone: 'bg-red-50 text-red-600' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-4 shadow-2xs"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 leading-none">{value}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setAdding(false);
                setError(null);
              }}
              className={`pb-3 -mb-[1px] text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                tab === t.key
                  ? 'border-[#1662F3] text-[#1662F3]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label} ({inventory.filter((i) => i.category === t.key).length})
            </button>
          ))}
        </div>

        {canEdit && adding && (
          <form
            onSubmit={handleAdd}
            className="p-5 border-b border-slate-200 bg-slate-50/60 grid grid-cols-2 md:grid-cols-5 gap-3 items-end"
          >
            {tab === 'FILAMENT' ? (
              <>
                <label className="text-xs font-semibold text-slate-700">
                  Material
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value as SupportedMaterial)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  >
                    {ALL_MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Colour
                  <input
                    type="text"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    placeholder="e.g. Black"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </label>
              </>
            ) : (
              <label className="text-xs font-semibold text-slate-700 col-span-2">
                Item name
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 0.4 mm hardened nozzle"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </label>
            )}
            <label className="text-xs font-semibold text-slate-700">
              Quantity
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Low-stock at
              <input
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              />
            </label>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold cursor-pointer"
            >
              Save Item
            </button>
            {error && (
              <p role="alert" className="col-span-full text-xs font-medium text-red-700">
                {error}
              </p>
            )}
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-700">
                <th className="py-3.5 pl-5 pr-3">Item</th>
                <th className="py-3.5 px-3">Quantity</th>
                <th className="py-3.5 px-3">Low-stock at</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Last updated</th>
                {canEdit && <th className="py-3.5 pl-3 pr-5 text-right">Remove</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-[13px]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/90">
                  <td className="py-3 pl-5 pr-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {canEdit ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name}`}
                          disabled={item.quantity === 0}
                          onClick={() => setInventoryQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          aria-label={`Quantity of ${item.name}`}
                          defaultValue={item.quantity}
                          key={`${item.id}-${item.quantity}`}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (e.target.value !== '' && n !== item.quantity) {
                              void setInventoryQuantity(item.id, n);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
                          className="w-16 px-2 py-1 rounded border border-slate-300 text-center text-xs font-semibold"
                        />
                        <button
                          type="button"
                          aria-label={`Increase ${item.name}`}
                          onClick={() => setInventoryQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                      </div>
                    ) : (
                      <span className="font-semibold">
                        {item.quantity} <span className="text-xs text-slate-500">{item.unit}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{item.lowStockThreshold}</td>
                  <td className="py-3 px-3">
                    <StockBadge item={item} />
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                    {item.updatedAt}
                    <span className="block text-[11px] text-slate-400">by {item.updatedBy}</span>
                  </td>
                  {canEdit && (
                    <td className="py-3 pl-3 pr-5 text-right">
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => setToDelete(item)}
                        className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    Nothing tracked here yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Remove ${toDelete?.name ?? 'item'}?`}
        description="This deletes the item from the inventory list."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          if (toDelete) removeInventoryItem(toDelete.id);
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
