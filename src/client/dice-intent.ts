/** Pure safeguards for mobile pointer/keyboard dice controls.
 * Moving between World Map and Board View may re-target synthetic clicks,
 * but a dice roll must have explicit button-local user intent.
 */
export function matchingRollPointer(armed:number|null,released:number,inBoard:boolean):boolean{
 return inBoard&&armed!==null&&armed===released;
}
export function accessibleRollClick(detail:number,focused:boolean,inBoard:boolean):boolean{
 return detail===0&&focused&&inBoard;
}
