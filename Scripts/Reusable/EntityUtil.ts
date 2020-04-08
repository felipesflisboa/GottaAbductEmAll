
namespace reusable {
	export class EntityUtil{
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
			EntityUtil.ToggleComponent(world, entity, ut.Disabled);
		}

		static ToggleActiveRecursively(world: ut.World, entity: ut.Entity): void{
			EntityUtil.SetActiveRecursively(world, entity, world.hasComponent(entity, ut.Disabled));
		}

		/**
		 * Set entity active/inactive including children. 
		 * Save/load an array since reference can disappears.
		 * If one of children change parent on toggle, this may results on unintended behaviours
		**/
		static SetActiveRecursively(world: ut.World, entity: ut.Entity, active:boolean): void{
			if(active)
			EntityUtil.SetActive(world, entity, active);
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
				EntityUtil.SetActiveRecursively(world, child, active);
			if(!active)
				EntityUtil.SetActive(world, entity, active);
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

		/**
		 * Compare entities
		**/
		static Equals(a:ut.Entity, b:ut.Entity) : boolean {
			return a.index == b.index && a.version == b.version;
		}
	}
}
