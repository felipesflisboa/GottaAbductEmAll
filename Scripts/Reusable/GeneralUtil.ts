
namespace reusable {
	/**
	 * General util class (move methods outside when possible).
	**/
	export class GeneralUtil{
		/**
		 * Cheap method for getting global position.
		 * Doesn't work if any parent was a change on rotation or scale.
		**/
		static ToGlobalPos(world: ut.World, entity: ut.Entity):Vector3 {
			let worldPos = new Vector3();
			let parent = entity;
			while(!parent.isNone()) {
					worldPos = world.getComponentData(parent, ut.Core2D.TransformLocalPosition).position.add(worldPos);
					parent = world.getComponentData(parent, ut.Core2D.TransformNode).parent;
			}
			return worldPos;
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
			return GeneralUtil.IndexOf(array, (e) => EntityUtil.Equals(e, entity));
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
