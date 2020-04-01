namespace game {
	@ut.executeAfter(ut.Shared.InputFence)
	export class InputSystem extends ut.ComponentSystem {
		OnUpdate():void {
			this.world.forEach([ut.Entity, game.Inputer], (entity, inputer) => {
				let activeInputArray = inputer.activeInputArray;
				inputer.activeInputArray = this.ClearActiveInputArray(activeInputArray);
				inputer.activeInputArray = this.SetKeyboardInput(activeInputArray);
				inputer.activeInputArray = this.SetButtonInput(
					activeInputArray, 
					inputer.inputButtonArray, 
					this.GetClickWorldPos(GameManagerSystem.GetMainCamEntity(this.world), this.GetClickArray())
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
		
		SetButtonInput(activeInputArray: boolean[], inputButtonEntityArray:ut.Entity[], clickWorldPosArray:Vector3[]) : boolean[]{
			if(this.IsClick()){
				for(let i=0; i<inputButtonEntityArray.length;i++){
					this.world.usingComponentData(
						inputButtonEntityArray[i], 
						[InputButton, ut.Core2D.TransformLocalScale], 
						(inputButton, tLocalScale)=>{
							if(this.AnyClickIsOnButtonRange(clickWorldPosArray, inputButtonEntityArray[i], tLocalScale.scale)){
								if([InputCommand.Action, InputCommand.Pause].indexOf(inputButton.command) == -1 || this.IsClickDown(i))
									activeInputArray[inputButton.command] = true;
							}
						}
					);
				}
			}
			return activeInputArray;
		}
		
		IsClick() : boolean {
			return ut.Runtime.Input.getMouseButton(0) || ut.Runtime.Input.touchCount() > 0;
		}

		IsClickDown(touchIndex:number) : boolean {
			return ut.Runtime.Input.getMouseButtonDown(0) || (
				ut.Runtime.Input.touchCount() > 0 && ut.Runtime.Input.getTouch(touchIndex).phase == ut.Core2D.TouchState.Began
			);
		}
		
		GetButtonRect(pos:Vector2|Vector3, scale:Vector2|Vector3) : ut.Math.Rect{
			return new ut.Math.Rect(pos.x - scale.x/2, pos.y - scale.y/2, scale.x, scale.y);
		}

		AnyClickIsOnButtonRange(clickWorldPosArray:Vector3[], buttonEntity:ut.Entity, buttonScale:Vector2|Vector3) : boolean{
			return reusable.GeneralUtil.IndexOf(clickWorldPosArray, (pos) => reusable.RectUtil.IsOn(
				this.GetButtonRect(reusable.GeneralUtil.ToGlobalPos(this.world, buttonEntity), buttonScale), pos
			))!= -1
		}

		GetClickWorldPos(cameraEntity: ut.Entity, clickArray: Vector2[]) : Vector3[] {
			let ret = []
			let displayInfo = this.world.getConfigData(ut.Core2D.DisplayInfo);
			for (const click of clickArray) {
				ret.push(ut.Core2D.TransformService.windowToWorld(
					this.world, cameraEntity, click, new Vector2(displayInfo.width, displayInfo.height)
				));
			}
			return ret;
		}
		
		GetClickArray() : Vector2[] {
			let ret = []
			for (let i = 0; i < ut.Runtime.Input.touchCount(); i++) {
				const touch = ut.Runtime.Input.getTouch(i);
				ret.push(new Vector2(touch.x, touch.y));
			}
			if(ut.Runtime.Input.touchCount()==0 && ut.Runtime.Input.getMouseButton(0))
				ret.push(ut.Runtime.Input.getInputPosition());
			return ret;
		}
	}
}
