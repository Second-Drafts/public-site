/* @ds-bundle: {"format":4,"namespace":"SecondDrafts","components":[{"name":"Button"},{"name":"Mark"},{"name":"StatusTag"},{"name":"TextField"},{"name":"MarginNote"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function omit(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }

  /* hand-drawn strokes, in a 100-wide box, stretched to fit the text */
  var PATHS = {
    underline: "M2 7 C 22 3, 46 9, 70 5 S 94 4, 98 6",
    circle: "M60 5 C 30 1, 3 8, 3 20 C 3 33, 34 38, 62 36 C 90 34, 99 24, 96 14 C 92 4, 62 1, 34 6",
    strike: "M0 7 C 30 5, 66 6, 100 4",
    check: "M3 13 L9 20 L21 3"
  };

  function Stroke(props) {
    return h("svg", { className: "sd-mark__svg sd-mark__svg--" + props.kind, viewBox: props.viewBox, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" },
      h("path", { d: PATHS[props.kind], pathLength: 1 }));
  }

  /* Button */
  function Button(props) {
    var variant = props.variant || "primary", size = props.size || "md";
    var rest = omit(props, ["variant", "size", "icon", "className", "children"]);
    if (!rest.type) rest.type = "button";
    rest.className = cx("sd-btn", "sd-btn--" + variant, "sd-btn--" + size, props.className);
    return h("button", rest, props.icon ? h("span", { className: "sd-btn__icon", "aria-hidden": "true" }, props.icon) : null, h("span", { className: "sd-btn__label" }, props.children));
  }

  /* Mark — a marker annotation over inline text */
  function Mark(props) {
    var kind = props.kind || "highlight";
    var rest = omit(props, ["kind", "className", "children"]);
    rest.className = cx("sd-mark", "sd-mark--" + kind, props.className);
    if (kind === "highlight") return h("mark", rest, props.children);
    if (kind === "strike") return h("del", rest, props.children, h(Stroke, { kind: "strike", viewBox: "0 0 100 12" }));
    if (kind === "check") return h("span", rest, props.children, h("svg", { className: "sd-mark__check", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, h("path", { d: PATHS.check, pathLength: 1 })));
    if (kind === "circle") return h("span", rest, props.children, h(Stroke, { kind: "circle", viewBox: "0 0 100 40" }));
    return h("span", rest, props.children, h(Stroke, { kind: "underline", viewBox: "0 0 100 12" }));
  }

  /* StatusTag */
  var STATUS = {
    draft: "Draft", review: "In review", approved: "Approved", published: "Published", blocked: "Blocked"
  };
  function StatusTag(props) {
    var status = STATUS[props.status] ? props.status : "draft";
    var glyph = null;
    if (status === "approved") glyph = h("svg", { className: "sd-tag__glyph", viewBox: "0 0 24 24", "aria-hidden": "true" }, h("path", { d: PATHS.check }));
    if (status === "blocked") glyph = h("svg", { className: "sd-tag__glyph", viewBox: "0 0 24 24", "aria-hidden": "true" }, h("path", { d: "M5 5 L19 19 M19 5 L5 19" }));
    return h("span", { className: cx("sd-tag", "sd-tag--" + status, props.className) }, glyph, props.children || STATUS[status]);
  }

  /* TextField */
  var fid = 0;
  function TextField(props) {
    var ref = React.useRef(null);
    if (ref.current === null) ref.current = "sd-field-" + (++fid);
    var id = props.id || ref.current;
    var msgId = id + "-msg";
    var rest = omit(props, ["label", "hint", "error", "multiline", "className", "id", "rows"]);
    rest.id = id;
    rest.className = "sd-field__input";
    if (props.error || props.hint) rest["aria-describedby"] = msgId;
    if (props.error) rest["aria-invalid"] = true;
    var control = props.multiline ? h("textarea", Object.assign({ rows: props.rows || 4 }, rest)) : h("input", Object.assign({ type: "text" }, rest));
    return h("div", { className: cx("sd-field", props.error && "sd-field--error", props.className) },
      h("label", { className: "sd-field__label", htmlFor: id }, props.label),
      control,
      props.error ? h("p", { className: "sd-field__msg sd-field__msg--error", id: msgId }, props.error)
        : props.hint ? h("p", { className: "sd-field__msg", id: msgId }, props.hint) : null);
  }

  /* MarginNote — a comment from a teammate or an agent */
  function MarginNote(props) {
    var color = props.color || "pink";
    return h("article", { className: cx("sd-note", props.resolved && "sd-note--resolved", props.className) },
      h("header", { className: "sd-note__head" },
        h("span", { className: "sd-note__nib sd-note__nib--" + color, "aria-hidden": "true" }),
        h("span", { className: "sd-note__author" }, props.author),
        props.agent ? h("span", { className: "sd-note__agent" }, "AGENT") : null,
        props.time ? h("span", { className: "sd-note__time" }, props.time) : null),
      props.quote ? h("p", { className: "sd-note__quote" }, h("mark", { className: "sd-mark sd-mark--highlight" }, props.quote)) : null,
      h("div", { className: "sd-note__body" }, props.children),
      props.actions ? h("footer", { className: "sd-note__actions" }, props.actions) : null);
  }

  window.SecondDrafts = Object.assign(window.SecondDrafts || {}, {
    Button: Button, Mark: Mark, StatusTag: StatusTag, TextField: TextField, MarginNote: MarginNote
  });
})();
