/** What every document kind's view builder gets besides the layout and the data: the image links. */
export interface ViewContext {
  /** Where the letterhead image is served from, or "" for none. */
  letterheadUrl: string;
  /** Where the signature image is served from, or "" for none. */
  signatureUrl: string;
  /** Links of the kind's own image slots (catalog.images) by slot key; "" or missing for none. */
  images?: Record<string, string>;
}
