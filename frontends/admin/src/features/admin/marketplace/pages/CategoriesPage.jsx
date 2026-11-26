"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Cog,
  Disc3,
  Grid2X2,
  Info,
  Layers3,
  Package,
  Pencil,
  Percent,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import {
  AdminHero,
  Button,
  Empty,
  Panel,
  Status,
} from "@/features/admin/shared/components/ui";
import { date } from "@/features/admin/shared/components/utils";
import { adminApi } from "@/features/admin/lib/adminApi";

const inputClass =
  "mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-orange-400 dark:border-neutral-700 dark:bg-neutral-900";
const subcategoryIcons = [Cog, Disc3, Wrench, Settings, Package, CircleDot];

function splitSubcategories(value) {
  return String(value || "")
    .split(/[,|\n\r]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function subcategoryNames(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) =>
      String(entry && typeof entry === "object" ? entry.name || "" : entry || "").trim(),
    )
    .filter(Boolean);
}

function compactCount(value) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function CategoryImage({ category, className = "" }) {
  const [imageIndex, setImageIndex] = useState(0);
  const fallbackImage = category.subcategoryImages?.find((entry) => entry.image)?.image || "";
  const imageSources = [...new Set([category.image, fallbackImage].filter(Boolean))];
  const image = imageSources[imageIndex];
  useEffect(() => setImageIndex(0), [category.image, fallbackImage]);

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-brand dark:from-orange-950/60 dark:to-neutral-900 ${className}`}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={() => setImageIndex((current) => current + 1)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Layers3 size={28} strokeWidth={1.6} />
      )}
    </div>
  );
}

function SubcategoryArtwork({ image, Icon }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [image]);

  return image && !imageFailed ? (
    <img
      src={image}
      alt=""
      loading="lazy"
      onError={() => setImageFailed(true)}
      className="h-full w-full object-cover"
    />
  ) : (
    <Icon size={27} strokeWidth={1.5} />
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const [query, setQuery] = useState("");
  const [newCategory, setNewCategory] = useState({
    name: "",
    image: "",
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
    setTotalProducts(Number(data.totalProducts) || 0);
    setDrafts(
      Object.fromEntries(
        rows.map((category) => [
          category.id,
          {
            name: category.name,
            image: category.image || "",
            subcategories: subcategoryNames(category.subcategories).join("\n"),
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
      `${category.name} ${subcategoryNames(category.subcategories).join(" ")}`
        .toLowerCase()
        .includes(value),
    );
  }, [categories, query]);
  const selectedCategory =
    visibleCategories.find((category) => category.id === selectedId) ||
    visibleCategories[0];
  const selectedSubcategories = subcategoryNames(
    selectedCategory?.subcategories,
  );
  const activeCount = categories.filter((category) => category.active).length;
  const subcategoryCount = categories.reduce(
    (total, category) => total + (category.subcategories?.length || 0),
    0,
  );
  const activePercent = categories.length
    ? Math.round((activeCount / categories.length) * 100)
    : 0;

  async function addCategory(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await adminApi.createCategory({
        ...newCategory,
        image: newCategory.image.trim(),
        markupPercent: Number(newCategory.markupPercent),
        subcategories: splitSubcategories(newCategory.subcategories),
      });
      setNewCategory({ name: "", image: "", subcategories: "", markupPercent: "0" });
      setShowAdd(false);
      await refresh();
      if (result.category?.id) setSelectedId(result.category.id);
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
        image: draft.image.trim(),
        markupPercent: Number(draft.markupPercent),
        subcategories: splitSubcategories(draft.subcategories),
      });
      await refresh();
      setEditing(false);
      setSuccess(`${draft.name.trim()} updated.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveMarkup(category) {
    const markupPercent = Number(drafts[category.id]?.markupPercent);
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateCategory(category.id, { markupPercent });
      await refresh();
      setSuccess(`${category.name} markup saved.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateCategory(category.id, { active: !category.active });
      await refresh();
      setSuccess(
        `${category.name} ${category.active ? "deactivated" : "activated"}.`,
      );
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
      setSelectedId("");
      setEditing(false);
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

  const stats = [
    { label: "Total categories", value: categories.length, icon: Package },
    { label: "Subcategories", value: subcategoryCount, icon: Grid2X2 },
    { label: "Total products", value: compactCount(totalProducts), icon: Layers3 },
    { label: "Active categories", value: `${activePercent}%`, icon: CheckCircle2 },
  ];

  return (
    <AdminPageLayout activeSection="Categories">
      <AdminHero
        eyebrow="CATALOG MANAGEMENT"
        title="Category Management"
        sub="Organize auto parts categories efficiently"
        action={
          <Button
            variant="primary"
            onClick={() => setShowAdd(true)}
            className="min-h-10 !bg-white px-4 !text-orange-700 shadow-lg hover:!bg-orange-50"
          >
            <Plus size={16} /> Add New Category
          </Button>
        }
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Panel key={label} className="flex min-h-[82px] items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-brand dark:bg-orange-950/50">
              <Icon size={22} />
            </span>
            <div className="min-w-0">
              <strong className="block font-display text-xl font-extrabold leading-tight">
                {value}
              </strong>
              <span className="mt-1 block truncate text-[10px] font-semibold text-neutral-500">
                {label}
              </span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(275px,.82fr)_minmax(0,1.9fr)]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800">
            <div>
              <h2 className="font-display text-base font-extrabold">All Categories</h2>
              <p className="mt-1 text-[10px] text-neutral-500">
                {categories.length} marketplace categories
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-50 text-brand dark:bg-orange-950/40">
              <Layers3 size={17} />
            </span>
          </div>
          <label className="relative block p-3 pb-2">
            <Search
              size={14}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search categories..."
              aria-label="Search categories"
              className="h-9 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-[11px] outline-none focus:border-orange-400 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <div className="max-h-[620px] space-y-1 overflow-y-auto p-2 pt-0">
            {loading ? (
              <p className="py-10 text-center text-xs text-neutral-500">
                Loading categories…
              </p>
            ) : (
              visibleCategories.map((category) => {
                const isSelected = selectedCategory?.id === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedId(category.id);
                      setEditing(false);
                      setShowAllSubcategories(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition ${
                      isSelected
                        ? "bg-orange-100/80 text-neutral-900 dark:bg-orange-950/40 dark:text-white"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <CategoryImage category={category} className="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[11px] font-extrabold">
                        {category.name}
                      </strong>
                      <small className="mt-0.5 block text-[9px] text-neutral-500">
                        {subcategoryNames(category.subcategories).length} subcategories
                      </small>
                    </span>
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-[9px] font-extrabold text-orange-700 dark:bg-orange-950/70 dark:text-orange-300">
                      +{Number(category.markupPercent) || 0}%
                    </span>
                    <ChevronRight
                      size={15}
                      className={isSelected ? "text-brand" : "text-neutral-400"}
                    />
                  </button>
                );
              })
            )}
            {!loading && !visibleCategories.length && (
              <Empty text="No categories match your search." />
            )}
          </div>
        </Panel>

        {selectedCategory ? (
          <div className="space-y-3">
            <Panel className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-4">
                <CategoryImage
                  category={{
                    ...selectedCategory,
                    image: drafts[selectedCategory.id]?.image ?? selectedCategory.image,
                  }}
                  className="h-24 w-24 sm:h-32 sm:w-32"
                />
                <div className="min-w-[180px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {editing ? (
                      <input
                        required
                        maxLength={80}
                        value={drafts[selectedCategory.id]?.name ?? selectedCategory.name}
                        onChange={(event) =>
                          updateDraft(selectedCategory.id, "name", event.target.value)
                        }
                        aria-label="Category name"
                        className="h-10 min-w-[180px] flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 text-lg font-extrabold outline-none focus:border-orange-400 dark:border-neutral-700"
                      />
                    ) : (
                      <h2 className="font-display text-xl font-extrabold sm:text-2xl">
                        {selectedCategory.name}
                      </h2>
                    )}
                    <Status value={selectedCategory.active ? "Active" : "Inactive"} />
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    {selectedSubcategories.length
                      ? `Includes ${selectedSubcategories.slice(0, 3).join(", ")}${selectedSubcategories.length > 3 ? " and more" : ""}.`
                      : "Organize products and subcategories for this part of your marketplace."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-neutral-50 px-3 py-2.5 text-[10px] dark:bg-neutral-900">
                    <span className="flex items-center gap-2">
                      <Grid2X2 size={14} className="text-neutral-500" />
                      <b>{selectedSubcategories.length}</b> subcategories
                    </span>
                    <span className="flex items-center gap-2">
                      <Package size={14} className="text-neutral-500" />
                      <b>{compactCount(selectedCategory.productCount)}</b> products
                    </span>
                    <span className="flex items-center gap-2 text-neutral-500">
                      <Check size={14} />
                      Updated {date(selectedCategory.updatedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {editing ? (
                    <>
                      <Button
                        onClick={() => saveCategory(selectedCategory)}
                        variant="primary"
                        disabled={saving}
                      >
                        <Save size={14} /> Save
                      </Button>
                      <Button onClick={() => setEditing(false)} disabled={saving}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => setEditing(true)}
                        disabled={saving}
                        className="!bg-neutral-900 !text-white hover:!bg-neutral-700 dark:!bg-neutral-100 dark:!text-neutral-900"
                      >
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button
                        onClick={() => deleteCategory(selectedCategory)}
                        disabled={saving}
                        className="border-red-200 text-red-700 hover:border-red-400 dark:border-red-900 dark:text-red-300"
                      >
                        <Trash2 size={14} /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editing && (
                <div className="mt-4 grid gap-3">
                  <label className="block text-[10px] font-bold">
                    Category image URL
                    <input
                      type="url"
                      value={drafts[selectedCategory.id]?.image ?? ""}
                      onChange={(event) =>
                        updateDraft(selectedCategory.id, "image", event.target.value)
                      }
                      placeholder="https://example.com/category-image.jpg"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-[10px] font-bold">
                    Subcategories
                    <textarea
                      rows={3}
                      value={drafts[selectedCategory.id]?.subcategories ?? ""}
                      onChange={(event) =>
                        updateDraft(selectedCategory.id, "subcategories", event.target.value)
                      }
                      placeholder="One subcategory per line"
                      className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-transparent p-3 text-xs outline-none focus:border-orange-400 dark:border-neutral-700"
                    />
                  </label>
                </div>
              )}
            </Panel>

            <Panel className="overflow-hidden border-orange-200 dark:border-orange-900/70">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-500 px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/15">
                    <Percent size={17} />
                  </span>
                  <div>
                    <h3 className="text-xs font-extrabold">Markup Settings</h3>
                    <p className="mt-0.5 text-[9px] text-orange-50">
                      Set markup percentage for this category
                    </p>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-[9px] font-semibold text-orange-50">
                  <Info size={13} /> Applied to storefront product prices
                </p>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-[minmax(170px,.8fr)_minmax(0,1.2fr)_auto] sm:items-center">
                <label className="text-[10px] font-bold">
                  Markup percentage
                  <span className="mt-1.5 flex h-10 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step=".01"
                      value={drafts[selectedCategory.id]?.markupPercent ?? "0"}
                      onChange={(event) =>
                        updateDraft(selectedCategory.id, "markupPercent", event.target.value)
                      }
                      className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      aria-label="Markup percentage"
                    />
                    <span className="grid w-10 place-items-center border-l border-neutral-200 bg-neutral-50 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                      %
                    </span>
                  </span>
                </label>
                <div className="rounded-lg bg-orange-50 px-3 py-2.5 text-[10px] dark:bg-orange-950/30">
                  <strong className="block">Final price example</strong>
                  <span className="mt-1 block text-orange-700 dark:text-orange-300">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(1000)}{" "}
                    →{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(
                      1000 *
                        (1 +
                          (Number(drafts[selectedCategory.id]?.markupPercent) || 0) /
                            100),
                    )}{" "}
                    with markup
                  </span>
                </div>
                <Button
                  variant="primary"
                  onClick={() => saveMarkup(selectedCategory)}
                  disabled={saving}
                  className="min-h-10"
                >
                  <Save size={14} /> Save Markup
                </Button>
              </div>
            </Panel>

            <Panel className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-extrabold">Subcategories</h3>
                  <p className="mt-1 text-[10px] text-neutral-500">
                    {selectedSubcategories.length} in this category
                  </p>
                </div>
                {selectedSubcategories.length > 6 && (
                  <button
                    onClick={() => setShowAllSubcategories((value) => !value)}
                    className="text-[10px] font-extrabold text-brand hover:text-brand-dark"
                  >
                    {showAllSubcategories ? "Show fewer" : "View all"} →
                  </button>
                )}
              </div>
              {editing ? (
                <p className="rounded-lg bg-orange-50 p-3 text-[10px] text-orange-800 dark:bg-orange-950/30 dark:text-orange-200">
                  Edit subcategories in the field above. Enter one name per line.
                </p>
              ) : selectedSubcategories.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
                  {(showAllSubcategories
                    ? selectedSubcategories
                    : selectedSubcategories.slice(0, 6)
                  ).map((name, index) => {
                    const Icon = subcategoryIcons[index % subcategoryIcons.length];
                    const image = selectedCategory.subcategoryImages?.find(
                      (entry) =>
                        entry.name.toLowerCase() === name.toLowerCase(),
                    )?.image;
                    return (
                      <div
                        key={`${selectedCategory.id}-${name}-${index}`}
                        className="min-w-0 overflow-hidden rounded-xl border border-neutral-200 p-2.5 text-center transition hover:border-orange-300 dark:border-neutral-800"
                      >
                        <span className="mx-auto grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-50 text-neutral-600 dark:from-neutral-800 dark:to-neutral-900 dark:text-neutral-300">
                          <SubcategoryArtwork image={image} Icon={Icon} />
                        </span>
                        <strong className="mt-2 block min-h-8 text-balance text-[10px] font-bold leading-4">
                          {name}
                        </strong>
                        <span className="mt-1 inline-flex rounded-full bg-orange-100 px-2 py-1 text-[9px] font-extrabold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                          +{Number(selectedCategory.markupPercent) || 0}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty text="No subcategories yet. Use Edit to add some." />
              )}
            </Panel>
          </div>
        ) : (
          <Panel className="grid min-h-[360px] place-items-center p-8">
            <Empty
              text={
                loading
                  ? "Loading category details…"
                  : "Add a category to start organizing your marketplace."
              }
            />
          </Panel>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-category-title"
            className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-[#151515]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold tracking-[.15em] text-brand">
                  NEW MARKETPLACE CATEGORY
                </p>
                <h2 id="add-category-title" className="mt-1 font-display text-lg font-extrabold">
                  Add New Category
                </h2>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={17} />
              </button>
            </div>
            <form onSubmit={addCategory} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] font-bold">
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
                  className={inputClass}
                />
              </label>
              <label className="text-[10px] font-bold">
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
                  className={inputClass}
                />
              </label>
              <label className="text-[10px] font-bold sm:col-span-2">
                Category image URL
                <input
                  type="url"
                  value={newCategory.image}
                  onChange={(event) =>
                    setNewCategory((current) => ({
                      ...current,
                      image: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/category-image.jpg"
                  className={inputClass}
                />
              </label>
              {newCategory.image.trim() && (
                <div className="flex items-center gap-3 sm:col-span-2">
                  <CategoryImage
                    category={{ image: newCategory.image.trim() }}
                    className="h-14 w-14"
                  />
                  <span className="break-all text-[10px] text-neutral-500">
                    Image preview
                  </span>
                </div>
              )}
              <label className="text-[10px] font-bold sm:col-span-2">
                Subcategories
                <textarea
                  rows={4}
                  value={newCategory.subcategories}
                  onChange={(event) =>
                    setNewCategory((current) => ({
                      ...current,
                      subcategories: event.target.value,
                    }))
                  }
                  placeholder="One per line or separated with commas"
                  className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm outline-none focus:border-orange-400 dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button onClick={() => setShowAdd(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  <Plus size={14} /> {saving ? "Saving…" : "Add category"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminPageLayout>
  );
}
