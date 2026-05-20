import { Plus, Trash2 } from 'lucide-react';
import { SETTINGS_COPY } from '@/constants/settingsCopy';
import { listDistinctCategories } from '@/db/workLogRepository';
import type { WorkCategory, WorkCategorySettings } from '@/types/settings';
import { newCategoryId } from '@/utils/workCategory';

export function WorkCategorySettingsSection({
  workCategories,
  onChange,
  onToast,
}: {
  workCategories: WorkCategorySettings;
  onChange: (next: WorkCategorySettings) => void;
  onToast: (msg: string) => void;
}) {
  const updateCategories = (categories: WorkCategory[]) => {
    let defaultCategoryId = workCategories.defaultCategoryId;
    if (!categories.some((c) => c.id === defaultCategoryId)) {
      defaultCategoryId = categories[0]?.id ?? defaultCategoryId;
    }
    onChange({ categories, defaultCategoryId });
  };

  const handleNameChange = (id: string, name: string) => {
    updateCategories(
      workCategories.categories.map((c) =>
        c.id === id ? { ...c, name } : c,
      ),
    );
  };

  const handleAdd = () => {
    const name = SETTINGS_COPY.workCategoriesNamePlaceholder;
    const id = newCategoryId(name);
    updateCategories([...workCategories.categories, { id, name: '' }]);
  };

  const handleRemove = async (id: string) => {
    if (workCategories.categories.length <= 1) {
      onToast(SETTINGS_COPY.workCategoriesMinOne);
      return;
    }
    const used = await listDistinctCategories();
    if (used.includes(id)) {
      onToast(SETTINGS_COPY.workCategoriesDeleteBlocked);
      return;
    }
    updateCategories(workCategories.categories.filter((c) => c.id !== id));
  };

  const handleDefaultChange = (id: string) => {
    onChange({ ...workCategories, defaultCategoryId: id });
  };

  return (
    <section className="card-surface space-y-3 p-4">
      <h2 className="section-title">{SETTINGS_COPY.workCategoriesTitle}</h2>
      <p className="text-xs text-muted">{SETTINGS_COPY.workCategoriesHint}</p>

      <ul className="space-y-2">
        {workCategories.categories.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] p-2"
          >
            <input
              type="text"
              value={cat.name}
              onChange={(e) => handleNameChange(cat.id, e.target.value)}
              placeholder={SETTINGS_COPY.workCategoriesNamePlaceholder}
              className="input-field min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => void handleRemove(cat.id)}
              className="shrink-0 p-2 text-secondary hover:text-[var(--color-danger)]"
              aria-label="删除大类"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleAdd}
        className="btn-secondary flex w-full items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {SETTINGS_COPY.workCategoriesAdd}
      </button>

      <label className="block space-y-1">
        <span className="label-field">
          {SETTINGS_COPY.workCategoriesDefaultLabel}
        </span>
        <select
          value={workCategories.defaultCategoryId}
          onChange={(e) => handleDefaultChange(e.target.value)}
          className="input-field"
        >
          {workCategories.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.id}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
