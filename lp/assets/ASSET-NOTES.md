# Local production assets

Prepared 2026-10-13. This pass adds files only; no website UI is implemented.

- `photos/`: 18 original public delivery files, copied without cropping, resizing, color changes, or re-encoding. `photos/source-map.json` links filenames to research IDs, pages, image URLs and SHA256. Photos and East Garage sign art remain subject to publication permission. Work images are historical examples, not current inventory or recent appointments.
- `icons/`: 9 requested Phosphor icons in regular and bold weights, 18 SVG files total, copied from the installed official `@phosphor-icons/core` 2.1.1 package. `icons/LICENSE-Phosphor.txt` retains the MIT copyright notice. `icons/source-map.json` records provenance and hashes. Regular filenames have no suffix; bold filenames end in `-bold.svg`.
- `fonts/`: official Google Fonts CSS2 API files for Bowlby One SC 400 and Barlow Condensed 700/800. `fonts/fonts.css` references local WOFF2 files. All returned Latin/Latin Extended/Vietnamese subsets are preserved (8 files, 123,644 bytes); only the matching Unicode subsets are used by the browser. OFL files are copied from the official Google Fonts repository. `fonts/google-fonts-original.css` preserves the request response; `fonts/source-map.json` records URLs and hashes.
- `fonts/fonts-jp.css`: Zen Kaku Gothic New 400/500/700/900 text subset. The 585 distinct characters come from the preparation versions of `design/copy.md`, `design/concepts.md`, the specified common Japanese UI terms, and printable ASCII. Four WOFF2 files total 279,196 bytes. `fonts/source-map-jp.json` records the exact source document hashes, character set and official URLs; `fonts/zen-kaku-gothic-new-subset-characters.txt` is the coverage basis. Only the sorted character set was sent to the public API. Final copy edits may need a missing-character supplement with an explicit unicode-range.

Official API documentation was already checked by the main task at https://developers.google.com/fonts/docs/css2; it was not re-verified here. License origin links are in the respective source maps. The preparation script is `../../research/tools/prepare_site_assets.py`.

Original photo hashes were compared during copy. Every downloaded font was checked for the WOFF2 signature and every OFL for its license heading. No tests were added for this file preparation.
## 最終素材記録（2026-10-13）

日本語フォントは最終HTML由来の不足35文字を `source-map-jp-supplement-01.json` に記録し、fonts-jp.cssへ限定unicode-rangeで追加。独立生成図案の記録は `illustrations/source-map.json`。実写真と静的参照の照合結果は `../../tools/validation-static.md`。
