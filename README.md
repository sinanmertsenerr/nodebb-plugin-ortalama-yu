# GPA Hesaplayıcı for NodeBB (nodebb-plugin-ortalama-yu)

A GPA calculator for Yaşar University students, inside a NodeBB 4 forum at `/ortalama`. Built for [Yaşar Forum](https://yu.uniforum.app).

- **Three steps.** Pick your level (lisans or ön lisans), pick your department from its faculty, then the department's whole curriculum opens, every semester one under the other. Enter letter grades and the cumulative average stays on screen in a sticky bar.
- **The university's own data and rules.** 47 programmes, 234 curricula and 3,885 courses with their ECTS credits from the official course catalogue (8 October 2026). Averages follow the regulation (Ön Lisans ve Lisans Eğitim-Öğretim ve Sınav Yönetmeliği, m. 21 and m. 30): weighted by ECTS, truncated to two decimals (2.999 → 2.99), the last grade of a repeated course counts, S/U/W stay out, NA counts as F.
- **Electives and extra courses.** Elective slots open their pool to choose from; any course from the catalogue, or one typed by hand, can be added to a semester.
- **A target.** Type the average you want and see what the remaining courses need.
- **Grades stay on the device.** They are kept in the browser's local storage. The plugin has no database and no API that writes.
- **Signed-in users only.** The app and the course data are served at `/ortalama/app/…` with `401` for guests, like the forum's other student tools.

Requires NodeBB 4.15 or later.

## Installation

    npm install https://codeload.github.com/sinanmertsenerr/nodebb-plugin-ortalama-yu/tar.gz/v1.0.0

Activate the plugin, rebuild and restart. Then add `/ortalama` to the navigation (ACP → Settings → Navigation).

## Development

    npm install
    npm run data     # data/*.json → static/data/<hash>/
    npm run build    # src/ → static/dist/
    npm test
    npm run dev      # http://127.0.0.1:4481/?tema=dark  (a local copy of the forum page with the app inside)

`data/` holds the compiled source data: `mufredat.json` (catalogue), `not-sistemi.json` (grading rules with article numbers), `timetable-2026-guz.json` and `ad-duzeltme.json` (course names written by hand where the catalogue's capitals were ambiguous).

## License

MIT. Icons from [Lucide](https://lucide.dev) (ISC).
