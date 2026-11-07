/** The roll result stays hidden until the dice land on the floor.
 * Time parameters are client-only animation; the server owns dice values.
 */
export const DICE_THROW_DURATION_MS=760;
export const DICE_SETTLE_DURATION_MS=520;
export const DICE_REVEAL_DELAY_MS=DICE_THROW_DURATION_MS+DICE_SETTLE_DURATION_MS;

export function diceResultRevealDelayMs(elapsedSinceThrow:number):number{
  if(!Number.isFinite(elapsedSinceThrow))return 0;
  return Math.max(0,DICE_THROW_DURATION_MS-Math.max(0,elapsedSinceThrow))+
    DICE_SETTLE_DURATION_MS;
}
