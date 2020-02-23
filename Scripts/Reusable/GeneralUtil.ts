
namespace reusable {
	//TODO general util with GeneralUtil using game specific methods
	/**
	 * General util class (move methods outside when possible).
	**/
	export class GeneralUtil{
		// Used as dictionary, since there is no support
		static childrenKeys : ut.Entity[] = [];
		static childrenContent : ut.Entity[][] = [];

		/**
		 * Add/Remove component from entity
		**/ 
		static ToggleComponent<T>(world: ut.World, entity: ut.Entity, ctype: ut.ComponentClass<T>): void{
			if(world.hasComponent(entity, ctype))
				world.removeComponent(entity, ctype);
			else
				world.addComponent(entity, ctype);
		}

		/**
		 * Toggle entity as active/inactive, excluding children
		**/ 
		static ToggleActive(world: ut.World, entity: ut.Entity): void{
			GeneralUtil.ToggleComponent(world, entity, ut.Disabled);
		}

		static ToggleActiveRecursively(world: ut.World, entity: ut.Entity): void{
			GeneralUtil.SetActiveRecursively(world, entity, world.hasComponent(entity, ut.Disabled));
		}

		/**
		 * Set entity active/inactive including children. 
		 * Save/load an array since reference can disappears.
		 * If one of children change parent on toggle, this may results on unintended behaviours
		**/
		static SetActiveRecursively(world: ut.World, entity: ut.Entity, active:boolean): void{
			if(active)
				GeneralUtil.SetActive(world, entity, active);
			let usedArray = null;
			let indexOf = GeneralUtil.IndexOfEntity(this.childrenKeys, entity);
			if(indexOf==-1){
				usedArray = [];
				for (let childCount = ut.Core2D.TransformService.countChildren(world, entity); childCount > 0; childCount--)
					usedArray.push(ut.Core2D.TransformService.getChild(world, entity, childCount-1));
				if(usedArray.length>0){
					this.childrenKeys.push(entity);
					this.childrenContent.push(usedArray);
				}
			}else{
				usedArray = this.childrenContent[indexOf];
			}
			for (let child of usedArray)
				GeneralUtil.SetActiveRecursively(world, child, active);
			if(!active)
				GeneralUtil.SetActive(world, entity, active);
		}

		/**
		 * Set entity active/inactive. Ignores if already was active/inactive
		**/
		static SetActive(world: ut.World, entity: ut.Entity, active:boolean): void{
			if(active){
				if(world.hasComponent(entity, ut.Disabled)){
					world.removeComponent(entity, ut.Disabled)
				}
			}else{
				if(!world.hasComponent(entity, ut.Disabled)){
					world.addComponent(entity, ut.Disabled)
				}
			}
		}

		static Sign(val:number) : number{
			if(val>0)
				return 1;
			if(val<0)
				return -1;
			return 0;
		}

		/**
		 * Format a number with a fixed number of total digits, being bigger or lower.
		 *      ExactDigits(12, 3) => "012"
		**/ 
		static ExactDigits(number:number, digits:number) : string {
			let ret = number.toString();
			while (ret.length < (digits || 2))
				ret = "0" + ret;
			return ret;
		}

		/** 
		 * Find with function. Return null if not found.
		**/
		static Find<T>(array:Array<T>, callbackFn:(value:T) => boolean){
			let indexOf = GeneralUtil.IndexOf(array, callbackFn);
			return indexOf==-1 ? null : array[indexOf];
		}

		/** 
		 * IndexOf with function.
		**/
		static IndexOf<T>(array:Array<T>, callbackFn:(value:T) => boolean){
			for(let i =0; i < array.length;i++)
				if(callbackFn(array[i]))
					return i;
			return -1;
		}

		/** 
		 * IndexOf of an entity array.
		**/
		static IndexOfEntity(array:ut.Entity[], entity:ut.Entity){
			return GeneralUtil.IndexOf(array, (e) => GeneralUtil.EntityEquals(e, entity));
		}

		/**
		 * Compare entities
		**/
		static EntityEquals(a:ut.Entity, b:ut.Entity) : boolean {
			return a.index == b.index && a.version == b.version;
		}

		/**
		 * GetKey who checks array 
		**/
		static GetKey(array:ut.Core2D.KeyCode[]) : boolean {
			return GeneralUtil.IndexOf(array, (e) => ut.Runtime.Input.getKey(e)) != -1;
		}

		/**
		 * GetKeyDown who checks array 
		**/
		static GetKeyDown(array:ut.Core2D.KeyCode[]) : boolean {
			return GeneralUtil.IndexOf(array, (e) => ut.Runtime.Input.getKeyDown(e)) != -1;
		}
	}
}
