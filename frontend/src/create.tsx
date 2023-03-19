import dashify from 'dashify';
import React from 'react';
import { v4 as uuid } from 'uuid';
import styles from './brick.css';

const mL = { unit: 'mL' } as const;
const g = { unit: 'g' } as const;
const tsp = { unit: 'tsp' } as const;
const celsius = { unit: '°C' } as const;
const oz = { unit: 'oz' } as const;
const inch = { unit: 'inch' } as const;
const blank = { unit: 'blank' } as const;

type Unit =
  | typeof mL
  | typeof g
  | typeof tsp
  | typeof celsius
  | typeof oz
  | typeof inch
  | typeof blank;

type Amount = { value: number, unit: Unit };
type Ingredient = {
  id: string,
  name: string,
  amount: Amount[],
  notes?: string,
  toExprContent: () => string,
};

type Recipe = { title: string, description?: string, author?: string, tail: Brick };

type Brick = {
  type: 'brick',
  parent:
    | Brick
    | BrickConnection
    | null,
  // Globally unique brick ID
  id: string,
  title?: string,
  steps: Step[],
  outputs: Ingredient[],
};

type BrickConnection = {
  type: 'connection',
  inputs: (Brick | BrickConnection)[],
  connectionMethod: string,
};

type Step = {
  // Unique within a brick
  id: string,
  text: string,
  stepExpressions: Expression[],
  tools: Tool[],
};

type Tool = { id: string, name: string, description?: string, icon?: string };

type Expression = { toExprContent(): string };

class StepView extends React.Component<{ step: Step }> {
  private renderText() {
    const { text, stepExpressions } = this.props.step;
    // Match text like "$0", but only if not preceded by a backslash to allow escaping
    const matches = text.matchAll(/(?<!\\)\$\d+?/g);
    const parts = [];
    let cursorPos = 0;
    for (const match of matches) {
      const index = match.index;
      if (!index) {
        throw new Error('missing index in regexp match');
      }
      const matchText = match[0];
      const expressionIndex = parseInt(matchText.substring(1));
      if (expressionIndex < 0 || expressionIndex >= stepExpressions.length) {
        throw new Error('attempted to reference out-of-bounds ingredient');
      }
      parts.push(text.substring(cursorPos, index));
      parts.push(stepExpressions[expressionIndex].toExprContent());
      cursorPos = index;
      cursorPos += matchText.length;
    }
    parts.push(text.substring(cursorPos));

    return parts.join('');
  }

  render() {
    return <li className={styles.step}>{this.renderText()}</li>;
  }
}

class BrickConnectionView extends React.Component<{ brickConnection: BrickConnection }> {
  render() {
    const { inputs, connectionMethod } = this.props.brickConnection;

    return (
      <div className={styles.brickConnection}>
        <div className={styles.brickConnectionInputs}>
          {inputs.map(input =>
            input.type === 'connection'
              ? <BrickConnectionView brickConnection={input}/>
              : <BrickView brick={input}/>
          )}
        </div>
        {connectionMethod}
      </div>
    );
  }
}

const BrickOrConnection = ({ input }: { input: Brick | BrickConnection }) =>
  input.type === 'connection'
    ? <BrickConnectionView brickConnection={input}/>
    : <BrickView brick={input}/>;

class BrickView extends React.Component<{ brick: Brick }> {
  render() {
    const { brick } = this.props;
    return (
      <div className={styles.brickWithParent}>
        {brick.parent && (
          <>
            <BrickOrConnection input={brick.parent}/>
            <div className={styles.brickParentConnectionLine}/>
          </>
        )}
        <div className={styles.brick}>
          <ul>{brick.steps.map(step => <StepView key={step.id} step={step}/>)}</ul>
        </div>
      </div>
    );
  }
}

class RecipeView extends React.Component<{ recipe: Recipe }> {
  render() {
    const { tail } = this.props.recipe;
    return (
      <div>
        <BrickView brick={tail}/>
      </div>
    );
  }
}

const amount = (value: number, unit: Unit) => ({
  value,
  unit,
  toExprContent: () => unit.unit === 'blank' ? value.toString() : `${value} ${unit.unit}`,
});
const ingr = (name: string, amount: Amount | Amount[], notes?: string): Ingredient => ({
  id: uuid(),
  amount: Array.isArray(amount) ? amount : [amount],
  name,
  notes,
  toExprContent: () => name,
});
const step = (text: string, stepExpressions: Expression[], tools?: Tool[]): Step => ({
  id: uuid(),
  text,
  stepExpressions,
  tools: tools || [],
});
const brick = (
  parent: Brick | BrickConnection | null,
  steps: Step[],
  outputs?: Ingredient[],
  title?: string,
): Brick => ({
  type: 'brick',
  parent,
  steps,
  title,
  id: title ? dashify(title) : uuid(),
  outputs: outputs || [],
});
const connect = (
  inputs: (Brick | BrickConnection)[],
  connectionMethod: string,
): BrickConnection => ({ type: 'connection', inputs, connectionMethod });

const [butter, flour, bakingSoda, salt, brownSugar, whiteSugar, eggs, vanilla, chocolate] = [
  ingr('unsalted butter', amount(227, g)),
  ingr('all-purpose flour', amount(250, g)),
  ingr('baking soda', amount(1, tsp)),
  ingr('salt', amount(0.75, tsp)),
  ingr('dark brown sugar', amount(215, g)),
  ingr('granulated sugar', amount(73, g)),
  ingr('large eggs', amount(2, blank)),
  ingr('vanilla extract', amount(2, tsp)),
  ingr('chocolate chips', amount(250, g)),
];

const brownButter = ingr('brown butter', butter.amount);
const brownButterBrick = brick(null, [
  step(
    'Cook $0 in a saucepan over medium heat, stirring often, until it foams, then browns, 5-8 minutes. Scrape into a large bowl and let cool slightly, until cool enough to touch (like the temperature of a warm bath), about 10 minutes.',
    [butter],
  ),
], [brownButter]);

const dryIngredients = ingr('dry ingredients', amount(1, blank));
const dryIngredientsBrick = brick(null, [
  step('Whisk $0, $1 and $2 in a medium bowl.', [flour, bakingSoda, salt]),
], [dryIngredients]);

const a = brick(brownButterBrick, [
  step(
    'Add $0 and $1 to $2. Using an electric mixer on medium speed, beat until incorporated, about 1 minute.',
    [brownSugar, whiteSugar, brownButter],
  ),
  step(
    'Add $0 and $1, increase mixer speed to medium-high, and beat until mixture lightens and begins to thicken, about 1 minute.',
    [eggs, vanilla],
  ),
]);
const b = connect([a, dryIngredientsBrick], 'mix');
const c = brick(b, [
  step(
    'Reduce mixer speed to low; add $0 and beat just to combine. Mix in $1 with a wooden spoon or rubber spatula.',
    [dryIngredients, chocolate],
  ),
  step(
    'Let dough sit at room temperature for at least 30 minutes to allow $0 to hydrate. Dough will look very loose at first, but will thicken as it sits.',
    [flour],
  ),
  step(
    'Place a rack in middle of oven; preheat to $0. Using a $1 ice cream scoop, portion out balls of dough and place on a parchment-lined baking sheet, spacing about $2 apart (you can also form dough into ping ping-sized balls with your hands). Do not flatten; cookies will spread as they bake. Sprinkle with sea salt.',
    [amount(190, celsius), amount(1, oz), amount(3, inch)],
  ),
  step(
    'Bake cookies until edges are golden brown and firm but centers are still soft, 9-11 minutes. Let cool on baking sheets 10 minutes, then transfer to a wire rack and let cool completely. Repeat with remaining dough and a fresh parchment-lined cooled baking sheet.',
    [],
  ),
]);

const recipe: Recipe = { title: 'Brown Butter Chocolate Chip Cookies', tail: c };

export function createApp() {
  return () => <RecipeView recipe={recipe}/>;
}
