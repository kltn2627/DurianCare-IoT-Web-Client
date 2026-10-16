# TODO: Diagnosis image storage

## Runtime evidence from the frontend

- Frontend diagnosis flow currently consumes `POST /api/v1/predict`.
- The response parser already accepts an optional `data.image.url` and `data.image.objectKey`.
- The UI only renders the stored image when `image.url` is actually returned by backend.
- If `image.url` is missing, the UI shows a friendly empty state and does not fabricate a storage URL.

## What is confirmed

- The frontend is ready to render a persisted diagnosis image if backend returns a URL.
- The frontend does not require any API contract change for this optional field.

## What is not confirmed by runtime evidence

- I could not verify from runtime evidence in this task that the prediction pipeline always uploads the diagnosis image to S3.
- I could not verify a guaranteed public/signed storage URL in every successful prediction response.

## Backend TODO if diagnosis image storage is required

If the product expects every successful prediction to persist the uploaded diagnosis image, backend should:

1. Upload the diagnosis image to the storage layer during `POST /api/v1/predict`.
2. Return a stable `data.image.url` and `data.image.objectKey` in the prediction response.
3. Keep the response optional-safe so frontend can still handle `null` when storage is unavailable.

## UI behavior

- Show the diagnosis image when `data.image.url` exists.
- Allow preview, fullscreen, download, and open-in-new-tab from the stored image.
- Keep the text report visible even when the image URL is missing.
