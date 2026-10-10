import assert from "node:assert/strict";
import { allOffTypes, isOffShift, setExtraOffTypes } from "../src/lib/off-types";
import { calculateTimes } from "../src/lib/shift-utils";
import { isWorkingShift } from "../src/lib/staffing-check";

setExtraOffTypes([]);
assert.deepEqual(allOffTypes(), ["有休", "休み", "代休"]);
assert.ok(isOffShift("代休") && isOffShift("休み") && isOffShift("有休"));
assert.ok(!isOffShift("09:00～18:00") && !isOffShift("") && !isOffShift(undefined));
assert.equal(isWorkingShift("代休"), false);
assert.deepEqual(calculateTimes("代休"), { breakTime: "0:00", workTime: "0:00" });
setExtraOffTypes(["特別休暇", "有休", "休み", " 夏季休暇 ", "特別休暇", "任意入力"]);
assert.deepEqual(allOffTypes(), ["有休", "休み", "代休", "特別休暇", "夏季休暇"]);
assert.equal(isWorkingShift("特別休暇"), false);
assert.deepEqual(calculateTimes("特別休暇"), { breakTime: "0:00", workTime: "0:00" });
assert.equal(isWorkingShift("09:00～18:00"), true);
setExtraOffTypes([]);
console.log("PASS: off types (代休 built-in, extras, not counted as work)");
