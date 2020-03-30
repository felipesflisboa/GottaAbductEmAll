namespace game {
	@ut.executeAfter(ut.Shared.InputFence)
	export class InputSystem extends ut.ComponentSystem {
		OnUpdate():void {
			this.world.forEach([ut.Entity, game.Inputer], (entity, inputer) => {
				let activeInputArray = inputer.activeInputArray;
				inputer.activeInputArray = this.ClearActiveInputArray(activeInputArray);
				inputer.activeInputArray = this.SetKeyboardInput(activeInputArray);
				inputer.activeInputArray = this.SetButtonInput(
					activeInputArray, inputer.inputButtonArray, this.GetPointerWorldPos(GameManagerSystem.GetMainCamEntity(this.world))
				);
			});
		}

		ClearActiveInputArray(activeInputArray: boolean[]) : boolean[]{
			for (let command = 0; command < activeInputArray.length; command++)
				activeInputArray[command] = false;
			return activeInputArray;
		}
			
		SetKeyboardInput(activeInputArray: boolean[]) : boolean[]{
			activeInputArray[InputCommand.Down] = reusable.GeneralUtil.GetKey(
				[ut.Core2D.KeyCode.S, ut.Core2D.KeyCode.DownArrow, ut.Core2D.KeyCode.Keypad2, ut.Core2D.KeyCode.Keypad5]
			);
			activeInputArray[InputCommand.Left] = reusable.GeneralUtil.GetKey(
				[ut.Core2D.KeyCode.A, ut.Core2D.KeyCode.LeftArrow, ut.Core2D.KeyCode.Keypad4]
			);
			activeInputArray[InputCommand.Right] = reusable.GeneralUtil.GetKey(
				[ut.Core2D.KeyCode.D, ut.Core2D.KeyCode.RightArrow, ut.Core2D.KeyCode.Keypad6]
			);
			activeInputArray[InputCommand.Up] = reusable.GeneralUtil.GetKey(
				[ut.Core2D.KeyCode.W, ut.Core2D.KeyCode.UpArrow, ut.Core2D.KeyCode.Keypad8]
			);
			activeInputArray[InputCommand.Action] = ut.Runtime.Input.getMouseButton(1) || reusable.GeneralUtil.GetKeyDown([
				ut.Core2D.KeyCode.Space, 
				ut.Core2D.KeyCode.LeftControl, 
				ut.Core2D.KeyCode.RightControl,
				ut.Core2D.KeyCode.Keypad1,
				ut.Core2D.KeyCode.Keypad3,
				ut.Core2D.KeyCode.Keypad7,
				ut.Core2D.KeyCode.Keypad9
			]);
			activeInputArray[InputCommand.Pause] = reusable.GeneralUtil.GetKeyDown(
				[ut.Core2D.KeyCode.P, ut.Core2D.KeyCode.KeypadEnter, ut.Core2D.KeyCode.Return, ut.Core2D.KeyCode.Escape]
			);
			return activeInputArray;
		}
		
		SetButtonInput(activeInputArray: boolean[], inputButtonEntityArray:ut.Entity[], pointerPos:Vector2|Vector3) : boolean[]{
			if(this.IsClick()){
				for(let inputButtonEntity of inputButtonEntityArray){
					this.world.usingComponentData(inputButtonEntity, [InputButton, ut.Core2D.TransformLocalScale], (inputButton, tLocalScale)=>{
						if(reusable.RectUtil.IsOn(
								this.GetButtonRect(reusable.GeneralUtil.ToGlobalPos(this.world, inputButtonEntity), tLocalScale.scale), pointerPos
						)){
							if([InputCommand.Action, InputCommand.Pause].indexOf(inputButton.command) == -1 || this.IsClickDown())
								activeInputArray[inputButton.command] = true;
						}
					});
				}
			}
			return activeInputArray;
		}
		
		IsClick() : boolean {
			return ut.Runtime.Input.getMouseButton(0) || ut.Runtime.Input.touchCount() > 0;
		}

		IsClickDown() : boolean {
			return ut.Runtime.Input.getMouseButtonDown(0) || (
				ut.Runtime.Input.touchCount() > 0 && ut.Runtime.Input.getTouch(0).phase == ut.Core2D.TouchState.Began
			);
		}
		
		GetButtonRect(pos:Vector2|Vector3, scale:Vector2|Vector3) : ut.Math.Rect{
			return new ut.Math.Rect(pos.x - scale.x/2, pos.y - scale.y/2, scale.x, scale.y);
		}

		/* //remove
		GetRect(tLocalPos:ut.Core2D.TransformLocalPosition, tLocalScale:ut.Core2D.TransformLocalScale) : ut.Math.Rect{
			return new ut.Math.Rect(
				tLocalPos.position.x - tLocalScale.scale.x/2,
				tLocalPos.position.y - tLocalScale.scale.y/2, 
				tLocalScale.scale.x, 
				tLocalScale.scale.y
			);
		}
		*/

		GetPointerWorldPos(cameraEntity: ut.Entity) : Vector3 {
			let displayInfo = this.world.getConfigData(ut.Core2D.DisplayInfo);
			return ut.Core2D.TransformService.windowToWorld(
				this.world, cameraEntity, ut.Runtime.Input.getInputPosition(), new Vector2(displayInfo.width, displayInfo.height)
			);
		}
	}
}
