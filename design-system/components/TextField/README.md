TextField is a labelled input or textarea; what the writer types is set in `prose`, because it is writing.

Consumer provides: `label` (short noun, shown in uppercase `label` style), optional `hint`, `error` (replaces the hint; say what's wrong and how to fix it), `multiline` + `rows` for longer text, and native input props (`value`, `onChange`, `placeholder`…). The id and `aria-describedby` are wired automatically.

Do: put placeholders in italic as example text ("e.g. The Long Second Act"), not instructions. Stack fields `space-6` apart. Don't: hide the label, or use the placeholder as the label.
