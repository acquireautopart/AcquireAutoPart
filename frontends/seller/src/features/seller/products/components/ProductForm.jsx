import { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button, Modal, Field } from "@/features/seller/shared/components/ui";
import { sellerApi } from "@/features/seller/lib/sellerApi";

export function ProductForm({ product, busy, error, onClose, onSubmit, onUploadImages }) {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [variants, setVariants] = useState(
    (product?.variants || []).map((v) => ({
      name: v.name,
      sku: v.sku || "",
      price: v.price,
      stock: v.stock,
    })),
  );
  const [fitments, setFitments] = useState(product?.fitments || []);
  const [images, setImages] = useState((product?.images || []).join("\n"));
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState("");
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(
    Boolean(product?.description || product?.images?.length || product?.variants?.length),
  );
  const [quality, setQuality] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    category: product?.category || "",
    subcategory: product?.subcategory || "",
    brand: product?.brand || "",
    partNumber: product?.partNumber || "",
    fitment: product?.fitment || "",
    description: product?.description || "",
    warranty: product?.warranty || "",
    condition: product?.condition || "New",
  });
  useEffect(() => {
    let active = true;
    sellerApi
      .categories()
      .then(({ categories: rows }) => {
        if (active) setCategories(rows || []);
      })
      .catch((requestError) => {
        if (active) setCategoriesError(requestError.message);
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  function updateQuality(key, value) {
    setQuality((current) => ({ ...current, [key]: value }));
  }
  const imageUrls = images
    .split("\n")
    .map((image) => image.trim())
    .filter(Boolean);
  const selectedCategory = categories.find(
    (category) =>
      category.name.toLowerCase() === quality.category.trim().toLowerCase(),
  );
  const subcategories = selectedCategory?.subcategories || [];

  function updateCategory(value) {
    const category = categories.find(
      (entry) => entry.name.toLowerCase() === value.trim().toLowerCase(),
    );
    setQuality((current) => ({
      ...current,
      category: value,
      subcategory:
        category?.subcategories?.some(
          (entry) => entry.toLowerCase() === current.subcategory.toLowerCase(),
        )
          ? current.subcategory
          : "",
    }));
  }

  async function uploadImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    if (imageUrls.length + files.length > 6) {
      setImageError("Upload up to 6 product images.");
      return;
    }

    setUploadingImages(true);
    setImageError("");
    const currentImages = [...imageUrls];
    try {
      for (const file of files) {
        const [uploadedUrl] = await onUploadImages([file]);
        currentImages.push(uploadedUrl);
        setImages(currentImages.join("\n"));
      }
    } catch (error) {
      setImageError(error.message);
    } finally {
      setUploadingImages(false);
    }
  }

  const addVariant = () =>
    setVariants((current) => [
      ...current,
      { name: "", sku: "", price: product?.price || 0, stock: 0 },
    ]);

  const updateVariant = (index, key, value) =>
    setVariants((current) =>
      current.map((variant, i) => (i === index ? { ...variant, [key]: value } : variant)),
    );

  const removeVariant = (index) => setVariants((current) => current.filter((_, i) => i !== index));
  function updateFitment(index, key, value) {
    setFitments((current) => current.map((fitment, i) => i === index ? { ...fitment, [key]: value } : fitment));
  }
  const removeImage = (index) => {
    setImages(imageUrls.filter((_, imageIndex) => imageIndex !== index).join("\n"));
    setImageError("");
  };

  return (
    <Modal
      title={product ? "Edit product" : "Add a product"}
      onClose={onClose}
      onSubmit={onSubmit}
      busy={
        busy ||
        uploadingImages ||
        imageUrls.length > 6 ||
        categoriesLoading ||
        Boolean(categoriesError) ||
        categories.length === 0
      }
      submitLabel={product ? "Save changes" : "Add product"}
      compact
    >
      {error && (
        <p
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}
      {categoriesError && (
        <p
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          Could not load managed categories: {categoriesError}
        </p>
      )}
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Product name" name="name" required defaultValue={product?.name} onChange={(event) => updateQuality("name", event.target.value)} compact />
        <Field
          label="SKU"
          name="sku"
          required
          defaultValue={product?.sku}
          onChange={(event) => updateQuality("sku", event.target.value)}
          placeholder="BRAKE-001"
          compact
        />
        <label className="mt-2 block text-xs font-bold text-neutral-600 dark:text-neutral-300">
          Category
          <input
            name="category"
            list="seller-product-category-options"
            required
            value={quality.category}
            onChange={(event) => updateCategory(event.target.value)}
            placeholder="Search or choose a category"
            className="mt-1.5 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <datalist id="seller-product-category-options">
            {categories.map((category) => (
              <option key={category.id} value={category.name} />
            ))}
          </datalist>
        </label>
        <label className="mt-2 block text-xs font-bold text-neutral-600 dark:text-neutral-300">
          Subcategory
          <input
            name="subcategory"
            list="seller-product-subcategory-options"
            required={subcategories.length > 0}
            disabled={Boolean(selectedCategory && !subcategories.length)}
            value={quality.subcategory}
            onChange={(event) =>
              updateQuality("subcategory", event.target.value)
            }
            placeholder={
              selectedCategory
                ? "Search or choose a subcategory"
                : "Choose a managed category first"
            }
            className="mt-1.5 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <datalist id="seller-product-subcategory-options">
            {subcategories.map((subcategory) => (
              <option key={subcategory} value={subcategory} />
            ))}
          </datalist>
        </label>
        <Field label="Brand" name="brand" defaultValue={product?.brand} onChange={(event) => updateQuality("brand", event.target.value)} compact />
        <Field label="Manufacturer part number" name="partNumber" defaultValue={product?.partNumber} onChange={(event) => updateQuality("partNumber", event.target.value)} placeholder="OEM / interchange number" compact />
        <Field
          label="Price"
          name="price"
          type="number"
          min="0"
          step=".01"
          required
          defaultValue={product?.price}
          compact
        />
        <Field
          label="Compare at price"
          name="compareAtPrice"
          type="number"
          min="0"
          step=".01"
          defaultValue={product?.compareAtPrice}
          compact
        />
        <Field
          label="Stock"
          name="stock"
          type="number"
          min="0"
          defaultValue={product?.stock ?? 0}
          hint={variants.length ? "variant stock is totaled automatically" : ""}
          compact
        />
        <Field
          label="Low-stock threshold"
          name="lowStockThreshold"
          type="number"
          min="0"
          defaultValue={product?.lowStockThreshold ?? 5}
          compact
        />
        <Field
          label="Vehicle fitment"
          name="fitment"
          defaultValue={product?.fitment}
          onChange={(event) => updateQuality("fitment", event.target.value)}
          placeholder="Year, make and model"
          compact
        />
        <label className="mt-2 block text-xs font-bold text-neutral-600 dark:text-neutral-300">
          Condition
          <select name="condition" defaultValue={product?.condition || "New"} onChange={(event) => updateQuality("condition", event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option>New</option><option>Refurbished</option><option>Used</option>
          </select>
        </label>
        <Field label="Warranty" name="warranty" defaultValue={product?.warranty} onChange={(event) => updateQuality("warranty", event.target.value)} placeholder="e.g. 12 months; see seller terms" compact />
        <label className="mt-2 block text-xs font-bold text-neutral-600 dark:text-neutral-300">
          Publish status
          <select
            name="status"
            defaultValue={product?.status || "Active"}
            className="mt-1.5 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option>Active</option>
            <option>Draft</option>
            <option>Archived</option>
          </select>
        </label>
      </div>
      <section className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/60" aria-label="Listing quality checklist">
        <h3 className="text-xs font-extrabold">Listing quality checklist</h3>
        <p className="mt-1 text-[10px] leading-4 text-neutral-500">More complete details help shoppers confirm that a part is right for their vehicle.</p>
        <div className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-2">
          {[
            ["Product name", Boolean(quality.name.trim())],
            ["SKU and category", Boolean(quality.sku.trim() && quality.category.trim())],
            ["At least one product image", imageUrls.length > 0],
            ["Vehicle fitment", Boolean(quality.fitment.trim())],
            ["Brand and manufacturer part number", Boolean(quality.brand.trim() && quality.partNumber.trim())],
            ["Condition and warranty details", Boolean(quality.condition && quality.warranty.trim())],
            ["Useful product description (40+ words)", quality.description.trim().split(/\s+/).filter(Boolean).length >= 40],
          ].map(([label, complete]) => (
            <p key={label} className={`flex items-center gap-1.5 text-[10px] ${complete ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-500"}`}>
              <Check size={12} className={complete ? "opacity-100" : "opacity-25"} />{label}
            </p>
          ))}
        </div>
      </section>
      <details
        open={showAdditionalDetails}
        onToggle={(event) => setShowAdditionalDetails(event.currentTarget.open)}
        className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-700"
      >
        <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
          Optional details: description, images and variants
        </summary>
        <div className="grid gap-x-4 px-3 pb-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              label="Description"
              name="description"
              rows={2}
              defaultValue={product?.description}
              onChange={(event) => updateQuality("description", event.target.value)}
              compact
            />
            <Field
              label="Image URLs"
              name="images"
              rows={2}
              required
              value={images}
              onChange={(event) => {
                const nextImages = event.target.value;
                const count = nextImages
                  .split("\n")
                  .map((image) => image.trim())
                  .filter(Boolean).length;
                setImages(nextImages);
                setImageError(count > 6 ? "A product can have up to 6 images." : "");
              }}
              hint={`${imageUrls.length} / 6 images; add at least 1 image`}
              compact
            />
            {imageUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {imageUrls.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700"
                  >
                    <img
                      src={image}
                      alt={`Product image ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label={`Remove product image ${index + 1}`}
                      className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white hover:bg-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="mt-3 block text-xs font-bold text-neutral-600 dark:text-neutral-300">
              Upload product images
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploadingImages || busy}
                onChange={uploadImages}
                className="mt-1.5 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-xs file:font-bold dark:file:bg-neutral-800"
              />
            </label>
            {uploadingImages && (
              <p className="mt-2 text-xs text-neutral-500" role="status">
                Uploading images to Cloudinary…
              </p>
            )}
            {imageError && (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {imageError}
              </p>
            )}
          </div>
          <div className="mt-3 sm:col-span-2">
            <section className="mb-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              <div className="flex items-center justify-between gap-2">
                <div><h3 className="text-xs font-extrabold">Structured vehicle fitment</h3><p className="mt-1 text-[10px] text-neutral-500">Add make and model to show a more useful vehicle match.</p></div>
                <Button type="button" onClick={() => setFitments((current) => [...current, { yearFrom: "", yearTo: "", make: "", model: "", trim: "", engine: "" }])}><Plus size={13} /> Add vehicle</Button>
              </div>
              <input type="hidden" name="fitments" value={JSON.stringify(fitments)} />
              {fitments.map((fitment, index) => (
                <div key={`fitment-${index}`} className="mt-3 grid gap-2 rounded-md bg-neutral-50 p-2 dark:bg-neutral-900 sm:grid-cols-3">
                  {[["yearFrom", "From year"], ["yearTo", "To year"], ["make", "Make *"], ["model", "Model *"], ["trim", "Trim"], ["engine", "Engine"]].map(([key, label]) => (
                    <label key={key} className="text-[9px] font-bold text-neutral-500">{label}<input type={key.startsWith("year") ? "number" : "text"} min={key.startsWith("year") ? 1900 : undefined} max={key.startsWith("year") ? 2100 : undefined} value={fitment[key] || ""} onChange={(event) => updateFitment(index, key, event.target.value)} className="mt-1 h-8 w-full rounded border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-950" /></label>
                  ))}
                  <button type="button" onClick={() => setFitments((current) => current.filter((_, i) => i !== index))} className="text-left text-[10px] font-semibold text-red-600">Remove fitment</button>
                </div>
              ))}
            </section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold">Variants</h3>
                <p className="mt-1 text-[10px] text-neutral-400">
                  Set separate SKU, price and stock for each option.
                </p>
              </div>
              <Button onClick={addVariant}>
                <Plus size={13} /> Add variant
              </Button>
            </div>
            {variants.map((variant, index) => (
              <div
                key={`${product?.id || "new"}-${index}`}
                className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700 sm:grid-cols-[1.3fr_1fr_1fr_.7fr_auto]"
              >
                <label className="text-[9px] font-bold text-neutral-500">
                  Variant name
                  <input
                    name={`variantName-${index}`}
                    value={variant.name}
                    onChange={(e) => updateVariant(index, "name", e.target.value)}
                    placeholder="Left side"
                    className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-transparent px-2 text-xs dark:border-neutral-700"
                  />
                </label>
                <label className="text-[9px] font-bold text-neutral-500">
                  SKU
                  <input
                    name={`variantSku-${index}`}
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, "sku", e.target.value)}
                    placeholder="SKU-L"
                    className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-transparent px-2 text-xs dark:border-neutral-700"
                  />
                </label>
                <label className="text-[9px] font-bold text-neutral-500">
                  Price
                  <input
                    name={`variantPrice-${index}`}
                    type="number"
                    min="0"
                    step=".01"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, "price", e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-transparent px-2 text-xs dark:border-neutral-700"
                  />
                </label>
                <label className="text-[9px] font-bold text-neutral-500">
                  Stock
                  <input
                    name={`variantStock-${index}`}
                    type="number"
                    min="0"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, "stock", e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-transparent px-2 text-xs dark:border-neutral-700"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  aria-label="Remove variant"
                  className="self-end rounded-md p-2 text-neutral-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </details>
    </Modal>
  );
}
