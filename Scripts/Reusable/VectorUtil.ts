
namespace reusable {
	/**
	 * General vector util class.
	**/
	export class VectorUtil{
		static V3To2(vec3:Vector3) : Vector2{
			return new Vector2(vec3.x, vec3.y);
		}

		static V2To3(vec2:Vector2) : Vector3{
			return new Vector3(vec2.x, vec2.y, 0);
		}
	}
}
