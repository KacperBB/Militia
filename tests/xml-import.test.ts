import test from "node:test";
import assert from "node:assert/strict";

import { buildTaxonomyTree, parseTaxonomyXml } from "../src/lib/taxonomy/xml-import";

const validXml = `
<taxonomy>
  <categories>
    <category slug="dom" name="Dom i Ogrod" keywords="ogrod,dom">
      <category slug="meble" name="Meble">
        <attribute slug="stan" name="Stan" type="select" required="true">
          <option value="new">Nowe</option>
          <option value="used">Uzywane</option>
        </attribute>
      </category>
    </category>
  </categories>
</taxonomy>
`;

test("parseTaxonomyXml parses valid nested categories", () => {
  const categories = parseTaxonomyXml(validXml);

  assert.equal(categories.length, 2);
  assert.equal(categories[0]?.slug, "dom");
  assert.equal(categories[1]?.slug, "meble");
  assert.equal(categories[1]?.parentSlug, "dom");
  assert.equal(categories[1]?.attributes.length, 1);
});

test("buildTaxonomyTree builds proper root and children", () => {
  const categories = parseTaxonomyXml(validXml);
  const tree = buildTaxonomyTree(categories);

  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.slug, "dom");
  assert.equal(tree[0]?.children.length, 1);
  assert.equal(tree[0]?.children[0]?.slug, "meble");
});

test("parseTaxonomyXml throws for duplicate category slug", () => {
  const xml = `
  <taxonomy>
    <category slug="a" name="A" />
    <category slug="a" name="A2" />
  </taxonomy>
  `;

  assert.throws(() => parseTaxonomyXml(xml), /Duplicate category slug/i);
});

test("parseTaxonomyXml throws when select has no options", () => {
  const xml = `
  <taxonomy>
    <category slug="a" name="A">
      <attribute slug="stan" name="Stan" type="select" />
    </category>
  </taxonomy>
  `;

  assert.throws(() => parseTaxonomyXml(xml), /must include at least one option/i);
});

test("parseTaxonomyXml throws when text has options", () => {
  const xml = `
  <taxonomy>
    <category slug="a" name="A">
      <attribute slug="opis" name="Opis" type="text">
        <option value="x">X</option>
      </attribute>
    </category>
  </taxonomy>
  `;

  assert.throws(() => parseTaxonomyXml(xml), /cannot define options/i);
});

test("parseTaxonomyXml throws for cyclic hierarchy", () => {
  const xml = `
  <taxonomy>
    <category slug="a" name="A" parentSlug="b" />
    <category slug="b" name="B" parentSlug="a" />
  </taxonomy>
  `;

  assert.throws(() => parseTaxonomyXml(xml), /Cycle detected/i);
});
