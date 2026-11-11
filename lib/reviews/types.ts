export type ProductReview = {
  id: string
  reviewer_name: string
  rating: number
  title: string
  body: string
  created_at: string
}

export type PendingProductReview = ProductReview & {
  product_handle: string
}

export type ProductReviewsResponse = {
  reviews: ProductReview[]
  count: number
  averageRating: number | null
}
