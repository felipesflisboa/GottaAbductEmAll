
namespace reusable {
	/**
	 * General random util class.
	**/
	export class RandomUtil{
		static Range(min:number | ut.Math.Range, max?:number) : number{
			if(min instanceof ut.Math.Range){
				let range = min as ut.Math.Range;
				return RandomUtil.Range(range.start, range.end);
			}
			let usedMin = min as number;
			return (max-usedMin)*Math.random()+usedMin;
		}

		/**
		 * Draw a random item from array.
		**/
		static SampleArray<T>(array:Array<T>) : T{
			return array[Math.floor(Math.random()*array.length)];
		}
	}
}