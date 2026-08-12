

**NativeForms**

**Field Behaviour &amp; Builder Reference**

Admin Form Builder — All Elements Explained

Version 1.0  ·  Confidential**How the Builder Works**

Every element you drag into a form falls into one of three buckets:
-  | 

**📋 Fields** | 

Collect data from the customer — text, choices, files, dates, etc. These produce submission values.
-  | 

**🏗 Layout** | 

Structure your form — containers, grids, columns, dividers, sections, accordions, tabs, spacers.
-  | 

**✨ Content** | 

Display-only elements — headings, paragraphs, images, videos, HTML blocks, icons, buttons, alerts.
-  | 

**🤖 Smart** | 

Logic &amp; automation — progress bar, step break, conditional blocks, repeatable groups, calculations, webhooks.

*This document covers the behaviour of every element: what it does, what options appear in the General tab (configuration), and what appears in the Styling tab.*
-  | 

**SECTION A — Layout Elements**

*Layout elements are invisible to the customer as data — they just arrange other elements on the canvas. They never produce a submission value.*
-  | 

**Container** | 

**Layout**

*A generic wrapper box that groups any set of elements together. Use it to apply shared background/border styling, or to create a visually distinct zone.*
-  | 

**⚙ Behaviour: **Drag elements inside the container. It resizes vertically to fit its children. Can be nested inside Grid or Column elements.

**🛠  General Tab**
-  | 

**Label** | 

Optional internal label (shown in builder only — not visible on form)
-  | 

**Width** | 

Full width (default), fixed px, or % of parent
-  | 

**Overflow** | 

Visible / Hidden / Scroll — controls what happens if children overflow the container

**🎨  Styling Tab**
-  | 

**Background** | 

Background color or gradient for the container box
-  | 

**Border** | 

Border color, width, radius per corner
-  | 

**Padding** | 

Inner spacing (top, right, bottom, left) between the border and child elements
-  | 

**Shadow** | 

Box shadow preset (None / Soft / Medium / Hard)
-  | 

**Grid** | 

**Layout**

*A CSS Grid-based layout that divides the form width into configurable columns, letting you place fields side-by-side.*
-  | 

**⚙ Behaviour: **Define the number of columns and gap. Drop fields into each grid cell. Each cell can be set to span multiple columns.

**🛠  General Tab**
-  | 

**Columns** | 

Number of grid columns (1–6)
-  | 

**Column Gap** | 

Horizontal spacing between columns (px or rem)
-  | 

**Row Gap** | 

Vertical spacing between rows
-  | 

**Responsive Breakpoint** | 

At what screen width columns collapse to single-column stacking

**🎨  Styling Tab**
-  | 

**Background** | 

Background fill for the grid area
-  | 

**Padding** | 

Outer padding around the entire grid
-  | 

**Columns** | 

**Layout**

*A simpler two-or-more-column splitter using flexbox, faster to set up than Grid for standard 50/50 or 33/67 splits.*
-  | 

**⚙ Behaviour: **Choose a column ratio preset (50/50, 33/67, etc.) or set custom widths. Each column is an independent drop zone.

**🛠  General Tab**
-  | 

**Column Ratio** | 

Preset: 50/50, 33/67, 25/75, or custom percentages
-  | 

**Gap** | 

Space between columns
-  | 

**Stack on Mobile** | 

Toggle: whether columns collapse vertically on small screens

**🎨  Styling Tab**
-  | 

**Background** | 

Per-column or overall background color
-  | 

**Divider** | 

Optional vertical divider line between columns — color, width, style
-  | 

**Divider** | 

**Layout**

*A horizontal rule that visually separates sections of the form. Purely decorative — no data collected.*
-  | 

**⚙ Behaviour: **Drag between any two elements. Renders as a horizontal line across the full form width (or custom width).

**🛠  General Tab**
-  | 

**Width** | 

Full / custom % or px
-  | 

**Alignment** | 

Left / Center / Right (when width &lt; 100%)

**🎨  Styling Tab**
-  | 

**Line Color** | 

Color of the divider line
-  | 

**Line Style** | 

Solid / Dashed / Dotted / Double
-  | 

**Line Height** | 

Thickness in px (1–8)
-  | 

**Margin** | 

Top and bottom spacing around the divider
-  | 

**Section** | 

**Layout**

*A labeled grouping of fields with an optional title and collapsible/expandable behaviour — like a fieldset.*
-  | 

**⚙ Behaviour: **Has a title bar at the top. Can be set to collapsed by default. All fields inside share the section's background and border styling.

**🛠  General Tab**
-  | 

**Title** | 

Section heading text (displayed to customer)
-  | 

**Collapsible** | 

Toggle: allows customer to collapse/expand the section
-  | 

**Default State** | 

Expanded or Collapsed when form first loads
-  | 

**Icon** | 

Optional icon shown next to the title

**🎨  Styling Tab**
-  | 

**Title Bar** | 

Background color, text color, font size/weight
-  | 

**Body** | 

Background color and padding for the content area
-  | 

**Border** | 

Border around the entire section block
-  | 

**Collapse Icon** | 

Color and style of the chevron/expand icon
-  | 

**Accordion** | 

**Layout**

*Multiple collapsible panels stacked vertically — like an FAQ layout. Only one (or more, depending on mode) panel open at a time.*
-  | 

**⚙ Behaviour: **Add panels in the General tab. Each panel has its own title and drop zone for elements. Click the title to expand/collapse.

**🛠  General Tab**
-  | 

**Panels** | 

Add/remove/reorder accordion panels; set each panel's title
-  | 

**Mode** | 

Single-open (only one panel at a time) or Multi-open
-  | 

**Default Open** | 

Which panel index is open when the form loads (or None)

**🎨  Styling Tab**
-  | 

**Panel Header** | 

Background, text color, font for the clickable title bar
-  | 

**Panel Body** | 

Background and padding of expanded content area
-  | 

**Divider** | 

Line between panels — color and style
-  | 

**Expand Icon** | 

Icon type (chevron/plus-minus), color, position
-  | 

**Tabs** | 

**Layout**

*Horizontal tab navigation where each tab shows a different set of fields — useful for long forms split into logical pages without a true multi-step flow.*
-  | 

**⚙ Behaviour: **Add tabs in the General tab. Each tab is an independent drop zone. Clicking a tab label switches the visible content pane. All tab data is submitted together in one submission.

**🛠  General Tab**
-  | 

**Tabs** | 

Add/remove/reorder tabs; set each tab's label text
-  | 

**Default Active** | 

Which tab index is visible when the form loads
-  | 

**Tab Position** | 

Top (horizontal) / Left (vertical sidebar)

**🎨  Styling Tab**
-  | 

**Tab Bar** | 

Background color of the tab strip
-  | 

**Active Tab** | 

Background, text color, and bottom/side indicator color for the selected tab
-  | 

**Inactive Tab** | 

Text color and hover state for non-active tabs
-  | 

**Content Area** | 

Background and padding of the visible tab pane
-  | 

**Card** | 

**Layout**

*A raised card-style container with a shadow and rounded corners — gives a distinct visual block to a group of fields.*
-  | 

**⚙ Behaviour: **Drop any elements inside. Renders as a white (or custom) card lifted above the form background. Supports an optional card header zone.

**🛠  General Tab**
-  | 

**Header Text** | 

Optional title shown at top of card
-  | 

**Header Subtext** | 

Optional subtitle below the header
-  | 

**Header Icon** | 

Optional icon in the card header

**🎨  Styling Tab**
-  | 

**Card Background** | 

Fill color of the card body
-  | 

**Header Background** | 

Separate background for the header zone
-  | 

**Border Radius** | 

Corner rounding for the card
-  | 

**Shadow** | 

Shadow preset (None / Soft / Medium / Hard)
-  | 

**Padding** | 

Inner padding of the card body
-  | 

**Spacer** | 

**Layout**

*An invisible block that adds vertical space between elements — like pressing Enter multiple times, but precise.*
-  | 

**⚙ Behaviour: **Drag between any two elements. Renders as an empty gap of the configured height. No label, no data, nothing visible to customer.

**🛠  General Tab**
-  | 

**Height** | 

Height of the spacer in px (default: 32px)

**🎨  Styling Tab**
-  | 

**(None)** | 

Spacer is invisible — no styling options
-  | 

**SECTION B — Content Elements**

*Content elements display information to the customer but never collect data. They are not included in form submissions.*
-  | 

**Heading** | 

**Content**

*A styled text headline — H1 through H6. Used to title your form, label sections, or call out important information.*
-  | 

**⚙ Behaviour: **Customer sees the heading text rendered at the chosen HTML heading level. No interaction, no submission value. Purely visual.

**🛠  General Tab**
-  | 

**Text** | 

The heading text content (supports basic inline formatting: bold, italic, underline)
-  | 

**Level** | 

H1 / H2 / H3 / H4 / H5 / H6 — affects semantic hierarchy and default size
-  | 

**Alignment** | 

Left / Center / Right / Justify
-  | 

**Link** | 

Optional: make the entire heading a hyperlink (URL + open in new tab toggle)

**🎨  Styling Tab**
-  | 

**Font Size** | 

Override the default H-level size (px or rem)
-  | 

**Font Weight** | 

Light / Regular / Medium / Bold / Black
-  | 

**Color** | 

Heading text color
-  | 

**Line Height** | 

Spacing between lines if text wraps
-  | 

**Margin** | 

Top/bottom margin below the heading
-  | 

**Paragraph** | 

**Content**

*A rich-text block for instructions, descriptions, or any body copy you want to display to the customer.*
-  | 

**⚙ Behaviour: **The rich text editor lets you type and format text (bold, italic, underline, lists, links). What you write is rendered as HTML inside the form — no customer interaction.

**🛠  General Tab**
-  | 

**Content** | 

Rich text editor — supports bold, italic, underline, ordered/unordered lists, hyperlinks, and inline HTML
-  | 

**Alignment** | 

Left / Center / Right / Justify

**🎨  Styling Tab**
-  | 

**Font Size** | 

Text size (px or rem)
-  | 

**Font Color** | 

Paragraph text color
-  | 

**Line Height** | 

Line spacing multiplier (e.g. 1.5)
-  | 

**Margin** | 

Top/bottom spacing around the paragraph
-  | 

**Image** | 

**Content**

*A static image displayed inside the form — a logo, banner, product photo, or illustrative graphic.*
-  | 

**⚙ Behaviour: **Upload an image file or paste a URL. Rendered as a non-interactive &lt;img&gt; tag inside the form. Can optionally be a clickable link.

**🛠  General Tab**
-  | 

**Source** | 

Upload from device or enter an external URL
-  | 

**Alt Text** | 

Accessibility description for screen readers
-  | 

**Link URL** | 

Optional: clicking the image opens this URL
-  | 

**Open in New Tab** | 

Toggle for link target

**🎨  Styling Tab**
-  | 

**Width** | 

Image display width (px, %, or auto)
-  | 

**Height** | 

Fixed height (px) or auto
-  | 

**Alignment** | 

Left / Center / Right within the form
-  | 

**Border Radius** | 

Rounding for the image corners
-  | 

**Object Fit** | 

Cover / Contain / Fill for fixed-size images
-  | 

**Video** | 

**Content**

*An embedded video player — supports YouTube, Vimeo, or a direct MP4 URL.*
-  | 

**⚙ Behaviour: **Renders an iframe embed (YouTube/Vimeo) or an HTML5 &lt;video&gt; element. Customer can play/pause but no data is collected from viewing.

**🛠  General Tab**
-  | 

**URL** | 

YouTube URL, Vimeo URL, or direct .mp4 link
-  | 

**Autoplay** | 

Toggle — auto-plays when form loads (muted if browser requires)
-  | 

**Loop** | 

Toggle — video loops on end
-  | 

**Show Controls** | 

Toggle — show/hide player controls
-  | 

**Aspect Ratio** | 

16:9 / 4:3 / 1:1 / custom

**🎨  Styling Tab**
-  | 

**Width** | 

Video player width (% or px)
-  | 

**Alignment** | 

Left / Center / Right
-  | 

**Border Radius** | 

Corner rounding on the player container
-  | 

**Shadow** | 

Drop shadow preset
-  | 

**HTML** | 

**Content**

*A raw HTML block — paste any custom HTML, including scripts, iframes, or third-party embeds (e.g. maps, chat widgets, custom components).*
-  | 

**⚙ Behaviour: **The HTML you enter is injected directly into the form's DOM inside a sandboxed container. Scripts run in the context of the storefront page. Use with care — invalid or conflicting markup can break the form layout.

**🛠  General Tab**
-  | 

**HTML Code** | 

A code editor pane where you write raw HTML. Supports &lt;script&gt; tags and inline styles.
-  | 

**Sanitize** | 

Toggle — when ON, strips &lt;script&gt; tags and event attributes for safety (recommended for untrusted content)
-  | 

**Render in Preview** | 

Toggle — whether the HTML renders live in the form builder preview, or only on the published storefront

**🎨  Styling Tab**
-  | 

**Container Padding** | 

Padding around the injected HTML block
-  | 

**Container Background** | 

Background fill behind the HTML content
-  | 

**Border** | 

Border around the HTML block container
-  | 

**(Note)** | 

Internal HTML styles always take precedence — these container styles are the outer wrapper only
-  | 

**Icon** | 

**Content**

*A single icon from the built-in icon library (based on Lucide / Heroicons). Used for decoration, bullet replacements, or emphasis.*
-  | 

**⚙ Behaviour: **Customer sees a static SVG icon. Optionally links to a URL. No data collected.

**🛠  General Tab**
-  | 

**Icon** | 

Search and pick from the icon library
-  | 

**Label** | 

Optional text shown below or beside the icon
-  | 

**Link URL** | 

Optional URL — makes the icon clickable
-  | 

**Alignment** | 

Left / Center / Right

**🎨  Styling Tab**
-  | 

**Size** | 

Icon size in px (16–128)
-  | 

**Color** | 

Icon fill/stroke color
-  | 

**Background** | 

Optional circular or square background behind the icon
-  | 

**Padding** | 

Spacing between icon and background edge
-  | 

**Gap** | 

Space between icon and label text
-  | 

**Button** | 

**Content**

*A display-only button that links to an external URL, triggers a page action, or is used purely for design. This is NOT the form submit button.*
-  | 

**⚙ Behaviour: **Clicking the button navigates to the configured URL or runs the assigned action. It does NOT submit the form. For submit, use the form's built-in Submit button in the Form Settings panel.

**🛠  General Tab**
-  | 

**Label** | 

Button text
-  | 

**Action** | 

Open URL / Scroll to element / Custom JS function name
-  | 

**URL / Target** | 

When action is "Open URL" — the destination and whether to open in new tab
-  | 

**Icon** | 

Optional leading icon from the library
-  | 

**Full Width** | 

Toggle: button stretches to full container width

**🎨  Styling Tab**
-  | 

**Variant** | 

Filled / Outlined / Ghost / Link-style
-  | 

**Background Color** | 

Fill color (Filled variant)
-  | 

**Text Color** | 

Label text color
-  | 

**Border** | 

Border color, width, radius (Outlined variant)
-  | 

**Hover State** | 

Background, text, border colors on mouse hover
-  | 

**Size** | 

Small / Medium / Large (affects padding + font size)
-  | 

**Alert** | 

**Content**

*A colored notification banner — info, success, warning, or error style. Used to display important notes or instructions to the customer.*
-  | 

**⚙ Behaviour: **Renders a non-interactive alert box. Customer reads it; no data is collected. Can optionally be dismissible.

**🛠  General Tab**
-  | 

**Type** | 

Info (blue) / Success (green) / Warning (yellow) / Error (red) — sets default icon and color
-  | 

**Title** | 

Bold heading line of the alert
-  | 

**Message** | 

Body text (supports basic HTML)
-  | 

**Icon** | 

Toggle: show/hide the type icon on the left
-  | 

**Dismissible** | 

Toggle: adds an × button so customer can close the alert

**🎨  Styling Tab**
-  | 

**Background** | 

Override the default type color for the alert background
-  | 

**Text Color** | 

Override title and body text color
-  | 

**Icon Color** | 

Override the alert icon color
-  | 

**Border** | 

Border style and color (e.g. a left-accent border)
-  | 

**Border Radius** | 

Corner rounding of the alert box
-  | 

**SECTION C — Basic Fields**

*Basic fields are the most common data-collecting elements — free text, numbers, email, phone, etc. Every one appears in form submissions.*
-  | 

**Text** | 

**Basic Field**

*A single-line free-text input — the default choice for names, short answers, reference numbers, or any plain-text response.*
-  | 

**⚙ Behaviour: **Renders a single-line &lt;input type="text"&gt; element. Customer types into it. Submitted value is the raw string. Supports browser autocomplete.

**🛠  General Tab**
-  | 

**Label** | 

Visible label above the input
-  | 

**Placeholder** | 

Ghost text shown inside the input when empty
-  | 

**Help Text** | 

Small descriptive text below the input
-  | 

**Required** | 

Toggle: makes this field mandatory before submission
-  | 

**Default Value** | 

Pre-filled text when the form loads
-  | 

**Min / Max Length** | 

Character count limits with configurable error messages
-  | 

**Validation Pattern** | 

Custom regex pattern + error message for advanced validation
-  | 

**Autocomplete** | 

HTML autocomplete attribute value (e.g. "name", "address-line1")

**🎨  Styling Tab**
-  | 

**(Universal only)** | 

Background, border, padding, font — all from the global style tokens or per-field override. No field-specific extras.
-  | 

**Email** | 

**Basic Field**

*A single-line input validated as an email address. Can also be used as the reply-to address for form notification emails.*
-  | 

**⚙ Behaviour: **Renders &lt;input type="email"&gt;. On mobile, triggers the email-optimized keyboard. Browser + server-side validation checks for valid email format. Can be mapped to the notification reply-to field.

**🛠  General Tab**
-  | 

**Label / Placeholder / Help Text** | 

Same as Text field
-  | 

**Required** | 

Toggle: mandatory field
-  | 

**Use as Reply-To** | 

Toggle: the value of this field is used as the reply-to address in submission email notifications
-  | 

**Default Value** | 

Pre-filled email address

**🎨  Styling Tab**
-  | 

**(Universal only)** | 

Same as Text field — no field-specific styling additions.
-  | 

**Number** | 

**Basic Field**

*A single-line numeric input with optional min/max bounds, step control, and optional prefix/suffix labels.*
-  | 

**⚙ Behaviour: **Renders &lt;input type="number"&gt;. Browser shows up/down spinner arrows. Value is submitted as a string but validated as a number. Supports decimal values.

**🛠  General Tab**
-  | 

**Min / Max Value** | 

Numeric bounds — values outside this range fail validation
-  | 

**Step** | 

Increment/decrement unit for the spinner arrows (e.g. 0.5, 10)
-  | 

**Decimal Places** | 

Number of decimal places allowed (0 = integer only)
-  | 

**Prefix Text** | 

Text displayed before the input (e.g. "$")
-  | 

**Suffix Text** | 

Text displayed after the input (e.g. "kg")

**🎨  Styling Tab**
-  | 

**Prefix/Suffix Color** | 

Text color of the prefix and suffix labels
-  | 

**Prefix/Suffix Spacing** | 

Gap between the prefix/suffix text and the input edge
-  | 

**Spinner Arrow Color** | 

Color of the up/down arrows inside the input
-  | 

**Spinner Visibility** | 

Toggle: show or hide the spinner arrows
-  | 

**Phone** | 

**Basic Field**

*A phone number input with an optional country/dial-code selector dropdown on the left.*
-  | 

**⚙ Behaviour: **Renders a styled text input (optionally prefixed with a dial-code picker). On mobile, triggers the numeric keyboard. Format validation checks the number against the chosen country's format.

**🛠  General Tab**
-  | 

**Country Code Selector** | 

Toggle: show a dial-code dropdown to the left of the input
-  | 

**Default Country** | 

Pre-selected country code when the form loads
-  | 

**Restrict to Countries** | 

Optional list of allowed countries in the dial-code dropdown
-  | 

**Phone Format Validation** | 

Toggle: validate the number format against the selected country's pattern

**🎨  Styling Tab**
-  | 

**Dial-Code Dropdown Background** | 

Background color of the country code selector
-  | 

**Dial-Code Dropdown Border** | 

Border of the country code selector — styled separately from the number input
-  | 

**URL** | 

**Basic Field**

*A single-line input validated as a web address (must start with http:// or https://).*
-  | 

**⚙ Behaviour: **Renders &lt;input type="url"&gt;. Browser validates format on submit. On mobile, triggers the URL-optimized keyboard. Submitted value is the raw URL string.

**🛠  General Tab**
-  | 

**Label / Placeholder / Help Text** | 

Same as Text field
-  | 

**Required** | 

Toggle: mandatory field
-  | 

**Default Value** | 

Pre-filled URL

**🎨  Styling Tab**
-  | 

**(Universal only)** | 

Same as Text field — no field-specific styling additions.
-  | 

**Textarea** | 

**Basic Field**

*A multi-line, resizable text input for longer responses — feedback, descriptions, notes, addresses.*
-  | 

**⚙ Behaviour: **Renders a &lt;textarea&gt; element. Customer can type across multiple lines. Can be resized by dragging the corner handle (configurable direction). Auto-grow option makes the box expand as text is entered.

**🛠  General Tab**
-  | 

**Rows** | 

Initial visible height in rows (e.g. 4)
-  | 

**Min / Max Height** | 

Height bounds in px when auto-grow is enabled
-  | 

**Resize Direction** | 

None / Vertical (default) / Horizontal / Both
-  | 

**Character Counter** | 

Toggle: show remaining/used character count; position above or below the textarea
-  | 

**Auto-Grow** | 

Toggle: textarea height increases automatically as the customer types
-  | 

**Min / Max Length** | 

Character count limits

**🎨  Styling Tab**
-  | 

**Resize Handle Color** | 

Color of the resize corner grip icon
-  | 

**Resize Handle Visibility** | 

Show or hide the resize handle
-  | 

**Character Counter Text Color** | 

Color of the counter text (e.g. grey when plenty left, red when near limit)
-  | 

**Password** | 

**Basic Field**

*A masked input for sensitive text — access codes, PIN entries, or any value that should not be visible while typing.*
-  | 

**⚙ Behaviour: **Renders &lt;input type="password"&gt; — characters are replaced with dots/asterisks. An eye icon lets the customer toggle visibility. Optional strength meter analyses the entered value against strength rules.

**🛠  General Tab**
-  | 

**Show/Hide Toggle** | 

Toggle: add the eye icon so the customer can reveal the password
-  | 

**Password Strength Meter** | 

Toggle: show a visual strength bar (Weak / Medium / Strong) below the input
-  | 

**Label / Placeholder / Help Text** | 

Standard field configuration options

**🎨  Styling Tab**
-  | 

**Eye Icon Color** | 

Color of the show/hide eye icon
-  | 

**Strength Bar — Weak** | 

Color of the strength bar at the "Weak" level
-  | 

**Strength Bar — Medium** | 

Color of the strength bar at the "Medium" level
-  | 

**Strength Bar — Strong** | 

Color of the strength bar at the "Strong" level
-  | 

**Hidden** | 

**Basic Field**

*An invisible field that silently submits a pre-determined value alongside the form — the customer never sees it.*
-  | 

**⚙ Behaviour: **Not rendered on the form at all. The value is computed on load from the configured source (static text, URL param, JS expression, or Shopify Liquid tag) and included in the submission payload under the field's key.

**🛠  General Tab**
-  | 

**Value Source** | 

Static Text — a fixed string always submitted as-is
-  |  | 

URL Parameter — reads a query string parameter from the page URL
-  |  | 

JS Expression — evaluates a JavaScript expression at load time (e.g. Date.now())
-  |  | 

Shopify Liquid Tag — resolved server-side (e.g. {{ customer.id }})
-  | 

**Include in Notifications** | 

Toggle: whether the hidden value appears in submission email notifications

**🎨  Styling Tab**
-  | 

**(None)** | 

Hidden fields are never rendered — there are no styling options.
-  | 

**SECTION D — Choice Fields**

*Choice fields let the customer select from a predefined set of options — instead of typing free text.*
-  | 

**Dropdown** | 

**Choice Field**

*A custom select control — the customer clicks to open a panel and picks one or more options from the list.*
-  | 

**⚙ Behaviour: **Renders a trigger button showing the current selection. Clicking opens a floating panel with the options list. Supports search/filter when many options are present. Submitted value is the selected option's value (not label).

**🛠  General Tab**
-  | 

**Options List** | 

Add/edit/remove options — each has a Label (displayed) and a Value (submitted). Drag to reorder.
-  | 

**Default Selected** | 

Which option is pre-selected when the form loads
-  | 

**Placeholder Text** | 

Text shown when no option is selected (e.g. "Select an option…")
-  | 

**Allow Search** | 

Toggle: adds a search box inside the dropdown panel to filter options
-  | 

**Multi-Select Mode** | 

Toggle: allows selecting more than one option
-  | 

**Max Selections** | 

When multi-select is ON — maximum number of options the customer can pick

**🎨  Styling Tab**
-  | 

**Trigger Box** | 

Background, border, text color, and padding of the closed dropdown button
-  | 

**Open Panel** | 

Background color and box shadow of the options panel when open
-  | 

**Option Hover** | 

Background and text color when mouse hovers over an option
-  | 

**Option Selected** | 

Background and text color for the active/selected option
-  | 

**Chevron Icon** | 

Color of the down-arrow icon; rotation animation when open
-  | 

**Checkbox** | 

**Choice Field**

*A group of checkboxes — the customer can tick one or more options.*
-  | 

**⚙ Behaviour: **Renders a list of styled checkboxes. Each option is independently toggleable. Submitted value is an array of selected option values. Min/max selection rules validated on submit.

**🛠  General Tab**
-  | 

**Options List** | 

Add/edit/remove options with Label and Value. Drag to reorder.
-  | 

**Min Selections** | 

Minimum number of checkboxes that must be ticked before submission
-  | 

**Max Selections** | 

Maximum number of checkboxes the customer can tick
-  | 

**Layout Direction** | 

Row (options side by side) or Column (stacked vertically)

**🎨  Styling Tab**
-  | 

**Checkbox Shape** | 

Square (default) / Rounded / Circle
-  | 

**Checkbox Size** | 

Size of the checkbox control in px (16–24)
-  | 

**Checked Fill Color** | 

Background color of the checkbox when ticked
-  | 

**Checkmark Icon Color** | 

Color of the ✓ checkmark inside the checked state
-  | 

**Radio** | 

**Choice Field**

*A group of radio buttons — the customer selects exactly one option.*
-  | 

**⚙ Behaviour: **Renders a set of radio inputs. Only one can be selected at a time — selecting a new one deselects the previous. Submitted value is the selected option's value string.

**🛠  General Tab**
-  | 

**Options List** | 

Add/edit/remove options with Label and Value. Drag to reorder.
-  | 

**Layout Direction** | 

Row (side by side) or Column (stacked)
-  | 

**Per-Option Image** | 

Optional image displayed alongside each option label
-  | 

**Image Size** | 

Width/height of per-option images (px)

**🎨  Styling Tab**
-  | 

**Radio Dot Color** | 

Color of the filled circle inside a selected radio button
-  | 

**Radio Dot Size** | 

Diameter of the inner dot (px)
-  | 

**Selected Ring Color** | 

Color of the outer ring border of the selected radio button
-  | 

**Toggle** | 

**Choice Field**

*A single on/off switch for a yes/no style question.*
-  | 

**⚙ Behaviour: **Renders a pill-shaped toggle switch. Clicking flips between on and off states. Submitted value is the configured "on value" or "off value" string (e.g. "yes"/"no" or "true"/"false").

**🛠  General Tab**
-  | 

**Label** | 

The question label shown above or beside the toggle
-  | 

**On Value** | 

The string submitted when the toggle is ON (default: "true")
-  | 

**Off Value** | 

The string submitted when the toggle is OFF (default: "false")
-  | 

**Default State** | 

Whether the toggle starts ON or OFF when the form loads

**🎨  Styling Tab**
-  | 

**Track Color — On** | 

Background color of the toggle track when ON
-  | 

**Track Color — Off** | 

Background color of the toggle track when OFF
-  | 

**Thumb Color** | 

Color of the circular thumb/handle
-  | 

**Size** | 

Overall toggle size (Small / Medium / Large)
-  | 

**Switch** | 

**Choice Field**

*A visual variant of Toggle — identical in behaviour but with an alternative track shape option (rounded vs square ends).*
-  | 

**⚙ Behaviour: **Same as Toggle — flips between two values. The Switch variant offers a slightly different visual style that some merchants prefer for their brand.

**🛠  General Tab**
-  | 

**(Same as Toggle)** | 

Label, On Value, Off Value, Default State

**🎨  Styling Tab**
-  | 

**Track Style Preset** | 

Rounded (pill-shaped, same as Toggle) or Square (rectangular track with rounded corners)
-  | 

**Track Color — On / Off** | 

Same as Toggle
-  | 

**Thumb Color** | 

Same as Toggle
-  | 

**Size** | 

Small / Medium / Large
-  | 

**Button Group** | 

**Choice Field**

*Segmented selection buttons — a more visual alternative to Radio or Checkbox for a small set of options.*
-  | 

**⚙ Behaviour: **Renders a row of styled buttons. Single-select mode works like Radio (one active at a time). Multi-select mode works like Checkbox (multiple can be active). Submitted value is the selected option value(s).

**🛠  General Tab**
-  | 

**Options List** | 

Add/edit/remove options with Label, Value, and optional Icon per option
-  | 

**Multi-Select** | 

Toggle: allow more than one button to be active at once
-  | 

**Option Icon** | 

Optional icon displayed above or beside each button's label

**🎨  Styling Tab**
-  | 

**Active Segment Background** | 

Fill color of the currently selected button(s)
-  | 

**Active Segment Text** | 

Text/icon color of the selected button(s)
-  | 

**Inactive Segment Background** | 

Fill color of unselected buttons
-  | 

**Inactive Segment Text** | 

Text/icon color of unselected buttons
-  | 

**Segment Divider** | 

Vertical divider line between buttons — color, width
-  | 

**Icon Color** | 

Color of per-option icons (active and inactive states separately)
-  | 

**SECTION E — Advanced Fields**

*Advanced fields handle specialized input types beyond text and simple choices — dates, ratings, file uploads, sliders, and signatures.*
-  | 

**Date** | 

**Advanced Field**

*A calendar picker for selecting a date. Customer clicks the input, a calendar popup appears, and they pick a date.*
-  | 

**⚙ Behaviour: **Clicking the input opens a floating calendar widget. Submitted value is the selected date formatted per the chosen display format (e.g. YYYY-MM-DD). Disabled dates/days are unclickable.

**🛠  General Tab**
-  | 

**Date Display Format** | 

Format of the submitted date string (e.g. YYYY-MM-DD, DD/MM/YYYY, MMM D YYYY)
-  | 

**Min Date** | 

Earliest selectable date (can be relative, e.g. "today" or a fixed date)
-  | 

**Max Date** | 

Latest selectable date
-  | 

**Disabled Days of Week** | 

Days (Sun–Sat) that are always unclickable (e.g. disable weekends)
-  | 

**Disabled Specific Dates** | 

A list of specific calendar dates to block out
-  | 

**First Day of Week** | 

Which day the calendar grid starts on (Sunday or Monday)
-  | 

**Show Today Button** | 

Toggle: adds a "Today" shortcut button in the calendar footer

**🎨  Styling Tab**
-  | 

**Calendar Popup Background** | 

Background color of the calendar widget popup
-  | 

**Selected Date Highlight** | 

Background and text color of the chosen date cell
-  | 

**Today Indicator** | 

Color of the dot or border marking today's date
-  | 

**Disabled Date Text** | 

Text color for dates that are blocked/unselectable (typically muted grey)
-  | 

**Time** | 

**Advanced Field**

*A time selection control — customer picks an hour and minute (and optionally AM/PM).*
-  | 

**⚙ Behaviour: **Opens a time picker UI (list, clock, or wheel depending on device). Submitted value is the time string in the chosen format.

**🛠  General Tab**
-  | 

**Format** | 

12-hour (with AM/PM) or 24-hour
-  | 

**Min Time** | 

Earliest selectable time
-  | 

**Max Time** | 

Latest selectable time
-  | 

**Minute Interval** | 

Step between selectable minutes (e.g. 15 = quarters only, 30 = half-hours only)

**🎨  Styling Tab**
-  | 

**Time List/Wheel Background** | 

Background of the time selector popup/wheel
-  | 

**Selected Value Highlight** | 

Background and text color of the currently selected time slot
-  | 

**DateTime** | 

**Advanced Field**

*A combined date-and-time picker that produces a single ISO timestamp value in one field.*
-  | 

**⚙ Behaviour: **Combines the Date and Time pickers in one UI. Customer first picks a date, then a time. Submitted value is a single ISO 8601 timestamp string (e.g. 2024-12-25T14:30:00).

**🛠  General Tab**
-  | 

**(Union of Date + Time)** | 

All Date and Time configuration options apply — date format, min/max date, min/max time, minute interval, first day of week, disabled dates/days

**🎨  Styling Tab**
-  | 

**(Union of Date + Time)** | 

All Date and Time styling options apply — calendar popup, selected highlight, today indicator, time wheel background
-  | 

**Rating** | 

**Advanced Field**

*A star, heart, thumbs, or NPS-style rating input. Customer clicks to select a score.*
-  | 

**⚙ Behaviour: **Renders a row of interactive icons. Hovering previews the rating; clicking locks it. Submitted value is the numeric score (e.g. 4 for 4 stars). NPS style submits 0–10.

**🛠  General Tab**
-  | 

**Rating Style** | 

Stars / Hearts / Thumbs / NPS (0–10 numbered scale)
-  | 

**Max Value** | 

Maximum rating (e.g. 5 for 5 stars, 10 for NPS)
-  | 

**Half-Star Toggle** | 

Stars style only — allows selecting 0.5 increments (e.g. 3.5 stars)
-  | 

**Low Label** | 

NPS only — label below score 0 (e.g. "Not likely")
-  | 

**High Label** | 

NPS only — label below score 10 (e.g. "Very likely")
-  | 

**Default Value** | 

Pre-selected rating when the form loads

**🎨  Styling Tab**
-  | 

**Icon Color — Selected** | 

Fill color of selected/active icons
-  | 

**Icon Color — Unselected** | 

Fill color of unselected icons (e.g. light grey)
-  | 

**Icon Color — Hover** | 

Fill color when mouse hovers over an icon
-  | 

**Icon Size** | 

Size of each rating icon in px
-  | 

**Gap Between Icons** | 

Horizontal spacing between icons
-  | 

**Range Slider** | 

**Advanced Field**

*A draggable slider for selecting a numeric value within a defined range — budget selectors, age ranges, satisfaction scores.*
-  | 

**⚙ Behaviour: **Renders a horizontal track with a draggable thumb. Customer drags left/right to select a value. Submitted value is the numeric position. Can optionally display the current value in a label above the thumb.

**🛠  General Tab**
-  | 

**Min Value** | 

Leftmost value of the slider
-  | 

**Max Value** | 

Rightmost value of the slider
-  | 

**Step** | 

Increment between snappable values
-  | 

**Default Value** | 

Starting thumb position when the form loads
-  | 

**Show Current Value** | 

Toggle: display the selected number above/below the thumb
-  | 

**Prefix** | 

Text shown before the value label (e.g. "$")
-  | 

**Suffix** | 

Text shown after the value label (e.g. "km")

**🎨  Styling Tab**
-  | 

**Track Color — Filled** | 

Color of the track portion to the left of the thumb (active range)
-  | 

**Track Color — Unfilled** | 

Color of the track portion to the right of the thumb
-  | 

**Thumb Color** | 

Color of the draggable thumb circle
-  | 

**Thumb Size** | 

Diameter of the thumb in px
-  | 

**Value Label Style** | 

Font, size, and color of the floating current-value display
-  | 

**Color Picker** | 

**Advanced Field**

*A swatch-based or hex-entry color selector — useful for product customization, printing options, or preference settings.*
-  | 

**⚙ Behaviour: **Renders a grid of preset color swatches. Customer clicks a swatch to select it. Optionally includes a hex input for custom colors. Submitted value is the hex string (e.g. #FF5733).

**🛠  General Tab**
-  | 

**Preset Swatch Palette** | 

Define the list of color swatches shown (each entry is a hex value with optional name)
-  | 

**Allow Custom Hex** | 

Toggle: show a free-text hex color entry below the swatches
-  | 

**Default Color** | 

Pre-selected color when the form loads

**🎨  Styling Tab**
-  | 

**Swatch Size** | 

Width/height of each color swatch in px
-  | 

**Swatch Shape** | 

Circle / Rounded Square / Square
-  | 

**Swatch Gap** | 

Spacing between swatches in the grid
-  | 

**Add Custom Color Button** | 

Background, text color, and border style of the "+ custom" hex entry button
-  | 

**File Upload** | 

**Advanced Field**

*A drag-and-drop or click-to-browse file capture field — accepts images, documents, or any specified file types.*
-  | 

**⚙ Behaviour: **Renders a drop zone area. Customer drags a file onto it or clicks to open the system file picker. Uploaded files are stored and the submission includes a URL or file reference. Optional preview thumbnail appears after upload.

**🛠  General Tab**
-  | 

**Accepted File Types** | 

MIME types or extensions allowed (e.g. image/*, .pdf, .docx). Unaccepted types are rejected with an error.
-  | 

**Max File Size** | 

Maximum size per file in MB
-  | 

**Max Files** | 

Maximum number of files the customer can upload (1 = single file)
-  | 

**Drop Zone Text** | 

Instruction text displayed inside the drop zone (e.g. "Drag files here or click to browse")
-  | 

**Show Preview** | 

Toggle: display a thumbnail preview of uploaded images below the drop zone

**🎨  Styling Tab**
-  | 

**Drop Zone Border** | 

Border style (dashed/solid), color, and radius of the upload area
-  | 

**Drop Zone Background** | 

Background fill of the drop zone area
-  | 

**Upload Icon** | 

Icon shown in the centre of the drop zone (choose from library)
-  | 

**Preview Thumbnail Size** | 

Width/height of image preview thumbnails in px
-  | 

**Preview Thumbnail Border** | 

Border style and radius around preview images
-  | 

**Signature** | 

**Advanced Field**

*A freehand drawing canvas for capturing a customer's handwritten signature — for agreements, consent, or order approvals.*
-  | 

**⚙ Behaviour: **Renders a bordered canvas area. Customer draws their signature using mouse or touch input. A "Clear" button resets the canvas. Submitted value is either a base64-encoded PNG or a URL to the uploaded image.

**🛠  General Tab**
-  | 

**Canvas Width / Height** | 

Dimensions of the signature drawing area in px
-  | 

**Pen Color** | 

Default ink color for the signature strokes
-  | 

**Pen Weight** | 

Stroke width (thin / medium / thick)
-  | 

**Background Color** | 

Canvas background (typically white or transparent)
-  | 

**Clear Button Label** | 

Custom text for the reset button (default: "Clear")
-  | 

**Stored Format** | 

Base64 PNG (inline in submission) or Storage URL (uploaded to file storage)

**🎨  Styling Tab**
-  | 

**Canvas Border** | 

Border style, color, width, and radius around the signature canvas
-  | 

**Clear Button Appearance** | 

Button style (Filled / Outlined / Ghost), color, size of the Clear button
-  | 

**SECTION F — Commerce Fields**

*Commerce fields are Shopify-native — they connect to the merchant's live catalog, discounts, and checkout via the Admin GraphQL API. They require an active Shopify connection.*
-  | 

**Coupon** | 

**Commerce Field**

*A discount code entry field that validates the entered code against the merchant's active Shopify discounts in real time.*
-  | 

**⚙ Behaviour: **Customer types a discount code. On blur or on a "Apply" button click, an API call validates the code against Shopify. A green ✓ icon confirms valid; a red ✗ with the configured error message shows for invalid codes. Submitted value is the validated code string.

**🛠  General Tab**
-  | 

**Validate Against Shopify** | 

Toggle: when ON, the entered code is checked against active Shopify discounts on entry. When OFF, any string is accepted.
-  | 

**Error Message** | 

Custom message displayed when the entered code is invalid (e.g. "This code is not valid or has expired")

**🎨  Styling Tab**
-  | 

**Valid Icon Color** | 

Color of the ✓ icon shown when a valid code is entered
-  | 

**Invalid Icon Color** | 

Color of the ✗ icon shown when an invalid code is entered
-  | 

**Quantity** | 

**Commerce Field**

*A numeric stepper for selecting a quantity — optionally linked to a product to enforce stock limits.*
-  | 

**⚙ Behaviour: **Renders a +/− stepper control (or a text input with stepper buttons). Customer increments or decrements. If linked to a product, the max quantity is capped by available inventory. Submitted value is the numeric quantity.

**🛠  General Tab**
-  | 

**Min Quantity** | 

Minimum selectable quantity (default: 1)
-  | 

**Max Quantity** | 

Maximum selectable quantity (default: unlimited, or capped by inventory if product is linked)
-  | 

**Step** | 

Increment unit (default: 1; set to case quantity for bulk orders, e.g. 6)
-  | 

**Linked Product** | 

Optional Shopify product — links this field to a specific product for inventory-aware max quantity
-  | 

**Default Quantity** | 

Starting quantity when the form loads

**🎨  Styling Tab**
-  | 

**Stepper Button Style** | 

Button shape (Square / Circle), background color, icon color for the + and − buttons
-  | 

**Input Width** | 

Width of the numeric display between the stepper buttons
-  | 

**Product Picker** | 

**Commerce Field**

*Lets the customer choose from a merchant-configured set of Shopify products — displayed as a grid of cards, a list, or a dropdown.*
-  | 

**⚙ Behaviour: **Products are pulled from the Shopify Admin API at form render time. Customer selects one or more products. Submitted value is an array of selected product IDs (and/or handles). Can trigger a Variant Picker for the selected product.

**🛠  General Tab**
-  | 

**Product Source** | 

Shopify resource picker — select specific products, a collection, or all products
-  | 

**Selection Mode** | 

Single product or multiple products
-  | 

**Display Style** | 

Grid (cards) / List / Dropdown
-  | 

**Show Price** | 

Toggle: display product price on each card/item
-  | 

**Show Image** | 

Toggle: display product thumbnail on each card/item

**🎨  Styling Tab**
-  | 

**Card Border (Grid Mode)** | 

Border style, width, color, and radius of product cards in grid display
-  | 

**Card Shadow** | 

Box shadow preset for grid cards
-  | 

**Selected State Highlight** | 

Border/background color applied to the selected product card
-  | 

**Price Text Color** | 

Color of the displayed product price text
-  | 

**Variant Picker** | 

**Commerce Field**

*A variant selector for a Shopify product — allows the customer to choose size, color, or any other product option.*
-  | 

**⚙ Behaviour: **Pulls variant options from Shopify for the linked product (either from a Product Picker field or a fixed product selection). Customer selects options. Unavailable variants are shown as greyed-out. Submitted value is the selected variant ID.

**🛠  General Tab**
-  | 

**Linked Product Source** | 

Link to a Product Picker field (dynamic) or select a fixed product
-  | 

**Option Display Style** | 

Dropdown (per option) / Swatches (for color options) / Buttons (same as Button Group)

**🎨  Styling Tab**
-  | 

**Swatch Style** | 

Swatch size, shape, border, and checkmark for selected state (Swatches mode)
-  | 

**Button Style** | 

Matches Button Group active/inactive styling (Buttons mode)
-  | 

**Unavailable Variant** | 

Text/background style for out-of-stock variants (typically muted with strikethrough)
-  | 

**Price** | 

**Commerce Field**

*A read-only price display computed dynamically from linked Product, Variant, Quantity, and Coupon fields.*
-  | 

**⚙ Behaviour: **Not an input — purely a display element. Recalculates in real time as the customer changes linked fields (e.g. changing quantity updates the total). Can show compare-at price with a strikethrough. No direct customer input; submitted value is the computed price number.

**🛠  General Tab**
-  | 

**Source Fields** | 

Link to the Product Picker, Variant Picker, Quantity, and/or Coupon fields that feed this price calculation
-  | 

**Currency Formatting** | 

Currency symbol, decimal places, thousand separator format
-  | 

**Show Compare-At Price** | 

Toggle: display the original/compare-at price with a strikethrough next to the discounted price

**🎨  Styling Tab**
-  | 

**Price Text Size** | 

Font size of the main price display
-  | 

**Price Text Weight** | 

Font weight (Regular / Medium / Bold)
-  | 

**Price Text Color** | 

Color of the computed price value
-  | 

**Compare-At Strikethrough Color** | 

Color of the struck-through original price text
-  | 

**Donation** | 

**Commerce Field**

*A donation amount selector with preset quick-pick amounts and an optional custom amount entry.*
-  | 

**⚙ Behaviour: **Renders a row of preset amount buttons (e.g. $5, $10, $25, $50). Customer clicks a preset or enters a custom value. Submitted value is the selected/entered numeric amount (in the configured currency).

**🛠  General Tab**
-  | 

**Preset Amounts** | 

List of preset donation amounts shown as quick-pick buttons (e.g. 5, 10, 25, 50, 100)
-  | 

**Allow Custom Amount** | 

Toggle: show a text input where the customer can type any amount
-  | 

**Min Custom Amount** | 

Minimum value allowed in the custom amount input
-  | 

**Max Custom Amount** | 

Maximum value allowed in the custom amount input
-  | 

**Currency** | 

Currency code displayed alongside amounts (e.g. USD, GBP, PKR)

**🎨  Styling Tab**
-  | 

**Preset Button — Active** | 

Background and text color of the selected preset amount button
-  | 

**Preset Button — Inactive** | 

Background and text color of unselected preset buttons
-  | 

**Custom Amount Input** | 

Style of the free-text input field (matches Number field styling patterns)
-  | 

**Currency Symbol** | 

Color and size of the currency symbol/label next to amounts
-  | 

**SECTION G — Smart Widgets**

*Smart widgets add logic, automation, and dynamic behaviour to forms. They do not collect direct customer input but powerfully control how the form behaves.*
-  | 

**Progress Bar** | 

**Smart Widget**

*A visual progress indicator for multi-step forms — shows how far through the form the customer is.*
-  | 

**⚙ Behaviour: **Automatically calculates progress based on the number of Step Break elements in the form. Updates as the customer moves between steps. Can display a numeric percentage or step label.

**🛠  General Tab**
-  | 

**Show Percentage** | 

Toggle: display the numeric % inside or beside the bar
-  | 

**Show Step Label** | 

Toggle: display current step number / total steps (e.g. "Step 2 of 4")
-  | 

**Position** | 

Top of form / Bottom of current step / Floating sticky header

**🎨  Styling Tab**
-  | 

**Bar Fill Color** | 

Color of the filled (completed) portion of the progress bar
-  | 

**Bar Track Color** | 

Color of the unfilled portion of the bar
-  | 

**Bar Height** | 

Thickness of the progress bar in px
-  | 

**Bar Border Radius** | 

Corner rounding of the bar (pill shape vs square ends)
-  | 

**Label Text Style** | 

Font, size, color of the percentage / step label
-  | 

**Step Break** | 

**Smart Widget**

*Divides the form into multiple pages/steps. Everything above a Step Break is "Step 1", everything between two Step Breaks is "Step 2", etc.*
-  | 

**⚙ Behaviour: **Inserts a pagination boundary. The form shows only one step at a time. Next/Back buttons navigate between steps. All steps are submitted together as one submission when the customer reaches the final Submit button.

**🛠  General Tab**
-  | 

**Step Title** | 

Display name for this step (used by Progress Bar and step labels)
-  | 

**Next Button Label** | 

Text on the "Next" button at the bottom of this step (default: "Next →")
-  | 

**Back Button Label** | 

Text on the "Back" button (default: "← Back")
-  | 

**Validate on Next** | 

Toggle: run field validation on this step before allowing "Next" (recommended ON)

**🎨  Styling Tab**
-  | 

**Next Button Style** | 

Matches Content → Button styling — variant, color, size
-  | 

**Back Button Style** | 

Same as Next button — often styled differently (e.g. ghost style)
-  | 

**Step Transition** | 

Animation when switching steps: None / Slide / Fade
-  | 

**Conditional Block** | 

**Smart Widget**

*A container whose contents are shown or hidden based on the values of other fields — the primary tool for conditional logic.*
-  | 

**⚙ Behaviour: **Define one or more conditions using the visual logic builder (field / operator / value). When conditions are met, the block's contents are shown; otherwise hidden. Hidden blocks are not included in the submission.

**🛠  General Tab**
-  | 

**Conditions** | 

Visual rule builder: pick a field, choose an operator (equals, contains, is not, greater than, etc.), and set a target value
-  | 

**Logic Mode** | 

ALL (all conditions must be true) or ANY (at least one condition must be true)
-  | 

**Show When** | 

Toggle: "Show when conditions are met" (default) or "Hide when conditions are met"

**🎨  Styling Tab**
-  | 

**(None — inherits from children)** | 

The Conditional Block itself has no visual styling. Child elements inside use their own styling.
-  | 

**Repeatable Group** | 

**Smart Widget**

*A set of fields the customer can repeat multiple times — e.g. adding multiple addresses, family members, or line items.*
-  | 

**⚙ Behaviour: **Renders the grouped fields once. An "Add Another" button appends a new copy of the group. Each repetition is independently filled. The submission value is an array of objects, one per repetition.

**🛠  General Tab**
-  | 

**Group Label** | 

Label for the repeatable unit (e.g. "Address", "Passenger")
-  | 

**Add Button Label** | 

Text on the "Add Another" button (default: "+ Add Another")
-  | 

**Remove Button Label** | 

Text on the per-row delete button (default: "Remove")
-  | 

**Min Repetitions** | 

Minimum number of groups required before submission (default: 1)
-  | 

**Max Repetitions** | 

Maximum number of groups allowed (default: unlimited)

**🎨  Styling Tab**
-  | 

**Group Border** | 

Border around each repeatable group instance (separates them visually)
-  | 

**Group Background** | 

Background of each group instance
-  | 

**Add Button Style** | 

Appearance of the "+ Add Another" button
-  | 

**Remove Button Style** | 

Appearance of the per-row remove button
-  | 

**Calculation** | 

**Smart Widget**

*A read-only computed value derived from a formula referencing other field values — totals, BMI calculators, discount summaries.*
-  | 

**⚙ Behaviour: **Evaluates the configured formula in real time as field values change. Supports arithmetic operators and references to field values by field key. Displayed as text — not editable by the customer. Submitted value is the computed result.

**🛠  General Tab**
-  | 

**Formula** | 

Expression using field keys (e.g. {quantity} * {price_per_unit}) and operators: + − * / ^ ( )
-  | 

**Label** | 

Display label above the computed value
-  | 

**Decimal Places** | 

Number of decimal places to round the result to
-  | 

**Prefix / Suffix** | 

Text to display before/after the result (e.g. "$" / " items")

**🎨  Styling Tab**
-  | 

**Result Text Size** | 

Font size of the displayed computed value
-  | 

**Result Text Color** | 

Color of the computed value
-  | 

**Result Text Weight** | 

Font weight of the result
-  | 

**Container** | 

Background and padding of the calculation display container
-  | 

**Webhook Trigger** | 

**Smart Widget**

*Fires an HTTP request to a configured URL when a specific event occurs — on field change, on step advance, or on submission.*
-  | 

**⚙ Behaviour: **Invisible to the customer. When the trigger event fires, a POST (or configured method) request is sent to the webhook URL with a JSON payload of current form field values. Can receive a response and use it to populate another field (e.g. address lookup, price calculation from external API).

**🛠  General Tab**
-  | 

**Webhook URL** | 

The endpoint URL to call
-  | 

**HTTP Method** | 

POST (default) / GET / PUT
-  | 

**Trigger Event** | 

On Field Change (specify which field) / On Step Advance / On Form Submit
-  | 

**Payload Fields** | 

Which field values to include in the request body (default: all fields)
-  | 

**Response Mapping** | 

Map response JSON keys to form field values (e.g. response.postcode → field:city_field)

**🎨  Styling Tab**
-  | 

**(None)** | 

Webhook Trigger is invisible — no styling options.