import fs from "fs-extra";
import path from "path";
import logUpdate from "log-update";
import { getIcons, generateIconName, readSVG, getWeights, ASSETS_PATH } from "./utils.js";
import { definitionsTemplate, componentTemplate } from "./template.js";

(() => {
  let passes = 0;
  const icons = [];
  const weights = getWeights();
  const weightsWithoutRegular = weights.filter((w) => w !== "regular");
  const regulars = getIcons("regular");

  fs.removeSync("lib");
  fs.copySync("src/lib", "lib");

  Promise.all(
    regulars.map((reg) => {
      logUpdate(`Generating ${reg}`);
      const types = [];
      const regular = reg.slice(0, -4); // activity.svg -> activity

      weightsWithoutRegular.forEach((weight) => {
        getIcons(weight).forEach((file) => {
          // activity-bold.svg -> ['activity', 'bold']
          const filename = file.slice(0, -4).split("-");
          if (filename.slice(0, -1).join("-") === regular) {
            types.push({
              weight: filename.pop(),
              path: readSVG(path.join(ASSETS_PATH, weight, file)),
            });
          }
        });
      });

      types.push({
        weight: "regular",
        path: readSVG(path.join(ASSETS_PATH, "regular", reg)),
      });

      icons.push({ name: regular, weights: types });

      let componentString = componentTemplate(types);
      let iconName = generateIconName(regular);

      fs.ensureDirSync(`./lib/${iconName}`);
      fs.writeFileSync(`./lib/${iconName}/${iconName}.svelte`, componentString);
      fs.writeFileSync(
        `./lib/${iconName}/index.js`,
        `import ${iconName} from "./${iconName}.svelte"\nexport default ${iconName};`
      );
      fs.writeFileSync(
        `lib/${iconName}/index.d.ts`,
        `export { ${iconName} as default } from "../";\n`
      );

      passes++;
    })
  ).then(() => {
    logUpdate.clear();

    const index = icons.map(
      (icon) =>
        `export { default as ${generateIconName(
          icon.name
        )} } from './${generateIconName(icon.name)}';`
    );
    index.unshift("export { default as IconContext } from './IconContext';\n");

    const definitions = definitionsTemplate(icons);

    fs.writeFileSync("./lib/index.js", index.join("\n"));
    fs.writeFileSync("./lib/index.d.ts", definitions);

    console.log(`${passes} component${passes > 1 ? "s" : ""} generated`);
    logUpdate.done();
  });
})();
