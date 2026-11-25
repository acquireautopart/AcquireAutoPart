"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import {
  Button,
  Empty,
  PageHeading,
  Panel,
  PanelTitle,
} from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

function splitSubcategories(value) {
  return String(value || "")
    .split(/[,|\n\r]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [query, setQuery] = useState("");
  const [newCategory, setNewCategory] = useState({
    name: "",
    subcategories: "",
    markupPercent: "0",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    const data = await adminApi.categories();
    const rows = data.categories || [];
    setCategories(rows);
    setDrafts(
      Object.fromEntries(
        rows.map((category) => [
          category.id,
          {
            name: category.name,
            subcategories: (category.subcategories || []).join("\n"),
            markupPercent: String(category.markupPercent ?? 0),
          },
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    refresh()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  const visibleCategories = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return categories;
    return categories.filter((category) =>
      `${category.name} ${(category.subcategories || []).join(" ")}`
        .toLowerCase()
        .includes(value),
    );
  }, [categories, query]);

  async function addCategory(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.createCategory({
        ...newCategory,
        markupPercent: Number(newCategory.markupPercent),
        subcategories: splitSubcategories(newCategory.subcategories),
      });
      setNewCategory({ name: "", subcategories: "", markupPercent: "0" });
      await refresh();
      setSuccess("Category added.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(category) {
    const draft = drafts[category.id];
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateCategory(category.id, {
        name: draft.name.trim(),
        markupPercent: Number(draft.markupPercent),
        subcategories: splitSubcategories(draft.subcategories),
      });
      await refresh();
      setSuccess(`${draft.name.trim()} updated.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category) {
    if (
      !window.confirm(
        `Delete "${category.name}"? Categories used by products cannot be deleted.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.deleteCategory(category.id);
      await refresh();
      setSuccess(`${category.name} deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(id, key, value) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  }

  return (
    <AdminPageLayout activeSection="Categories">
      <PageHeading
        title="Categories"
        sub="Manage seller product categories, subcategories and private storefront markup"
      />
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <Panel className="p-5">
        <PanelTitle
          title="Add a category"
          eyebrow="NEW MARKETPLACE CATEGORY"
        />
        <form onSubmit={addCategory} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">
            Category name
            <input
              required
              maxLength={80}
              value={newCategory.name}
              onChange={(event) =>
                setNewCategory((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
            />
          </label>
          <label className="text-xs font-bold">
            Markup percent
            <input
              type="number"
              min="0"
              max="100"
              step=".01"
              required
              value={newCategory.markupPercent}
              onChange={(event) =>
                setNewCategory((current) => ({
                  ...current,
                  markupPercent: event.target.value,
                }))
              }
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
            />
          </label>
          <label className="text-xs font-bold sm:col-span-2">
            Subcategories
            <textarea
              rows={3}
              value={newCategory.subcategories}
              onChange={(event) =>
                setNewCategory((current) => ({
                  ...current,
                  subcategories: event.target.value,
                }))
              }
              placeholder="One per line or separated with commas"
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-transparent p-3 text-sm dark:border-neutral-700"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Add category"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="p-5">
        <PanelTitle
          title="Managed categories"
          eyebrow={`${categories.length} CATEGORIES`}
        />
        <label className="mt-4 block text-xs font-bold">
          Search categories
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search category or subcategory"
            className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
          />
        </label>
        {loading ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            Loading categories…
          </p>
        ) : visibleCategories.length ? (
          <div className="mt-4 space-y-3">
            {visibleCategories.map((category) => {
              const draft = drafts[category.id] || {};
              return (
                <section
                  key={category.id}
                  className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="min-w-[220px] flex-1 text-xs font-bold">
                      Category name
                      <input
                        required
                        maxLength={80}
                        value={draft.name ?? category.name}
                        onChange={(event) =>
                          updateDraft(category.id, "name", event.target.value)
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        disabled={saving}
                        onClick={() => saveCategory(category)}
                      >
                        Save changes
                      </Button>
                      <Button
                        type="button"
                        disabled={saving}
                        onClick={() => deleteCategory(category)}
                        className="border-red-200 text-red-700 hover:border-red-400 dark:border-red-900 dark:text-red-300"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                    <label className="text-xs font-bold">
                      Markup percent
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step=".01"
                        value={draft.markupPercent ?? "0"}
                        onChange={(event) =>
                          updateDraft(category.id, "markupPercent", event.target.value)
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      Subcategories
                      <textarea
                        rows={3}
                        value={draft.subcategories ?? ""}
                        onChange={(event) =>
                          updateDraft(category.id, "subcategories", event.target.value)
                        }
                        className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-transparent p-3 text-sm dark:border-neutral-700"
                      />
                    </label>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <Empty text="No categories match your search." />
        )}
      </Panel>
    </AdminPageLayout>
  );
}
