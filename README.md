# Firefox Addon Action

This is a GitHub Action that allows you to publish to Firefox addon store.

Currently it only supports updating an existing addon, not creating a new one.

It is used in [web scrobbler](https://github.com/web-scrobbler/web-scrobbler/blob/master/.github/workflows/deploy.yml), see that for example usage.

This addon is forked from: https://github.com/yayuyokitano/firefox-addon

## Usage

```yaml
steps:
  - uses: inverse/firefox-addon@v0.0.7-alpha
    with:
      api_key: ${{ secrets.AMO_ISSUER }}
      api_secret: ${{ secrets.AMO_SECRET }}
      guid: '{799c0914-748b-41df-a25c-22d008f9e83f}'
      xpi_path: web-scrobbler-firefox.zip
      approval_notes: |
        Built from commit ${{ github.sha }}.
        Reviewer note: bundled vendor files are generated during CI.
      src_path: web-scrobbler-src.zip # Optional
```

## Inputs

- `guid`: Existing AMO add-on guid to update.
- `xpi_path`: Path to the packaged XPI to upload.
- `api_key`: AMO API issuer/key.
- `api_secret`: AMO API secret.
- `approval_notes`: Optional reviewer-only notes for the created version.
- `src_path`: Optional path to a source zip uploaded after version creation.

## Credentials

Check the [API keys page](https://addons.mozilla.org/en-US/developers/addon/api/key/) to get your credentials for authentication.

## License

MIT
