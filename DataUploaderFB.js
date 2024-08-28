const path = require("path");
const config = require(path.join(process.cwd(), "config.json"));

const KANACONVERTER_PATH = path.join(
  process.cwd(),
  config["path"]["kanaConverter"]
);
const TRANSFER_LIST_PATH = path.join(
  process.cwd(),
  config["path"]["transfer_field_2.7"]
);
const OFFISTA_CLASS_PATH = path.join(process.cwd(), config["path"]["offista"]);
const KanaConverter_class = require(KANACONVERTER_PATH);
const TRANSFER_LIST = require(TRANSFER_LIST_PATH);
const KanaConverter = new KanaConverter_class();
const Offista = require(OFFISTA_CLASS_PATH);
module.exports = class DataUploader {
  constructor() {
    this.offistaInstance = new Offista({ is_dumpLog: false });
  }

  convertKintoneToOffista(kintoneRecord, transferFields) {
    let returnObj = { relationship: 0, memo: "" };
    transferFields.forEach((element) => {
      const from = element.from;
      const dest = element.dest;
      const type = element.type;

      let value;
      if (from == null) value = "";
      else {
        const recordObj = kintoneRecord[from];

        if (recordObj === undefined) {
          const error_message = `key "${from}" is not defined.\nPlease change the file "${TRANSFER_LIST_PATH}"`;
          console.error(error_message);
          return;
        }
        value = recordObj.value;

        switch (type) {
          case undefined:
            break;
          case "insert_born_hyphen":
            if (!value.includes("-")) {
              let formattedNumber =
                value.substring(0, 4) +
                "-" +
                value.substring(4, 6) +
                "-" +
                value.substring(6);
              value = formattedNumber;
            }
            break;
          
          case "full":
            value = KanaConverter.halfToFull(value);
            break;
          case "half":
            value = KanaConverter.fullToHalf(value);
            break;
          case "boolean":
            switch (dest) {
              case "is_foreigner":
                if (value === "日本人") value = 0;
                else value = 1;
                break;
              case "health_division":
                if (value === "加入する") value = 1;
                else value = 0;
                break;
              case "welfare_annuity_division":
                if (value === "加入する") value = 1;
                else value = 0;
                break;
              case "employment_insurance_division":
                if (value === "加入する") value = 1;
                else value = 0;
                break;
              default:
                console.error(
                  `"${type}/${dest}" is not defined in this program.`
                );
                return;
            }
            break;
          case "int":
            switch (dest) {
              case "select_occupation":
                switch (value) {
                  case "":
                    value = 0;
                    break;
                  case "無職":
                    value = 1;
                    break;
                  case "パート":
                    value = 2;
                    break;
                  case "年金受給者":
                    value = 3;
                    break;
                  case "小・中学生以下":
                    value = 4;
                    break;
                  case "高・大学生":
                    value = 5;
                    break;
                  case "その他":
                    value = 6;
                    break;
                  default:
                    returnObj["occupation"] = value; 
                    value = 6;
                }
                break;
              case "tax_law_support_add_reason":
                switch (value) {
                  case "":
                    value = 0;
                    break;
                  case "配偶者の就職":
                    value = 1;
                    break;
                  case "婚姻":
                    value = 2;
                    break;
                  case "出生":
                    value = 31;
                    break;
                  case "離職":
                    value = 32;
                    break;
                  case "収入減少":
                    value = 33;
                    break;
                  case "収入減":
                    value = 33;
                    break;
                  case "同居":
                    value = 34;
                    break;
                  case "その他":
                    value = 35;
                    break
                  default:
                    returnObj["tax_law_support_add_reason_other"] = value; 
                    value = 35;
                }
                break;

              case "tax_law_support_del_reason":
                switch (value) {
                  case "":
                    value = 0;
                    break;
                  case "死亡":
                    value = 31;
                    break;
                  case "就職":
                    value = 32;
                    break;
                  case "収入増加":
                    value = 33;
                    break;
                  case "75歳到達":
                    value = 34;
                    break;
                  case "障害認定":
                    value = 35;
                    break;
                  case "その他":
                    value = 36;
                    break;
                  default:
                    returnObj["tax_law_support_del_reason_other"] = value; 
                    value = 36;
                }
                break;
                
              case "si_support":
                if (value === "該当する") value = 1;
                else if (value === "該当しない") value = 0;
                break;
              case "tax_law_support":
                if (value === "該当する") value = 1;
                else if (value === "該当しない") value = 0;
                break;
              case "handicapped_div":
                if (value === "該当しない") value = 0;
                else if (value === "一般の障害者") value = 1;
                else if (value === "特別障害者") value = 2;
                else if (value === "同居特別障害者") value = 3;
                break;
              case "contract_period_determined":
                if (value === "期間の定めあり") value = 1;
                else if (value === "期間の定めなし") value = 2;
                else value = 0;
                break;
              case "activity_out_qualification":
                if (value === "有") value = 1;
                else if (value === "無") value = 2;
                break;
              case "dispatch_contract_working_classification":
                if (value === "該当") value = 1;
                else if (value === "非該当") value = 2;
                break;
              case "sex":
                if (value === "男") value = 1;
                else if (value === "女") value = 2;
                break;
              case "living_together":
                if (value === "同居") value = 1;
                else if (value === "別居") value = 2;
                else value = 0;
                break;
              case "loss_qualification_reason_employ":
                switch (value) {
                  case "自己都合による退職":
                    value = 2;
                    break;
                  case "契約期間満了":
                    value = 0;
                    break;
                  case "退職勧奨":
                    value = 0;
                    break;
                  case "会社都合":
                    value = 3;
                    break;
                  case "関連会社移籍":
                    value = 0;
                    break;
                  case "その他":
                    value = 0;
                    break;
                  default:
                    value = 0;
                }
                break;
              case "relationship":
                // 1夫、2妻、3内縁の夫、4内縁の妻
                switch (value) {
                  case "夫":
                    value = 1;
                    break;
                  case "妻":
                    value = 2;
                    break;
                  case "父":
                    value = 3;
                    break;
                  case "母":
                    value = 4;
                    break;
                  case "子":
                    value = 5;
                    break;
                  case "兄":
                    value = 6;
                    break;
                  case "弟":
                    value = 7;
                    break;
                  case "姉":
                    value = 8;
                    break;
                  case "妹":
                    value = 9;
                    break;
                  case "祖父":
                    value = 10;
                    break;
                  case "祖母":
                    value = 11;
                    break;
                  case "孫":
                    value = 12;
                    break;
                  case "その他":
                    break;
                  default:
                    returnObj["relationship_detail"] = value;
                    value = 99;
                }
                break;
              
              default:
                console.error(
                  `"${type}/${dest}" is not defined in this program.`
                );
                console.log(value);
                return;
            }
            break;
          case "divide by 1000":
            value = String(Math.round(Number(value) / 1000));
            break;
          case "remove hyphen":
            value = value.replaceAll("-", "");
            break;

          case "insert tel hyphen":
            if (value == "") {
              return value;
            } else if (!value.includes("-")) {
              let formattedNumber =
                value.substring(0, 3) +
                "-" +
                value.substring(3, 7) +
                "-" +
                value.substring(7);
              value = formattedNumber;
            }
            break;
          default:
            console.error(
              `the type "${type}/${dest}" is not defined in program`
            );
            return;
        }
      }

      if (dest === "memo") returnObj.memo += `${from}=${value}\n`;
      else returnObj[dest] = value;
    });

    return returnObj;
  }

  sync_personal_OffistaData(record) {
    let transferFields = [];
    const essential = TRANSFER_LIST.essential.fields;
    const basic = TRANSFER_LIST.basic.fields;
    const enrollResidency = TRANSFER_LIST.enroll_residency.fields;
    const enrollSocialInsurance = TRANSFER_LIST.enroll_social_insurance.fields;
    const enrollEmploymentInsurance =
      TRANSFER_LIST.enroll_employment_insurance.fields;
    const retire = TRANSFER_LIST.retire.fields;
    if (record["連絡種別"].value === "退職連絡") {
      transferFields = essential.concat(retire);
    } else if (record["連絡種別"].value === "氏名・住所の変更") {
      transferFields = essential.concat(basic);
    } else if (record["連絡種別"].value === "雇用保険・社会保険の加入・脱退") {
      transferFields = essential.concat(
        enrollSocialInsurance,
        enrollEmploymentInsurance
      );
    } else if (record["連絡種別"].value === "入社連絡") {
      transferFields = essential.concat(
        basic,
        enrollResidency,
        enrollSocialInsurance,
        enrollEmploymentInsurance,
        retire
      );
    } else if (
      record["連絡種別"].value === "家族の追加" ||
      record["連絡種別"].value === "家族の扶養変更"
    ) {
      transferFields = essential;
    }
    return this.convertKintoneToOffista(record, transferFields);
  }

  async backupAddress(companyName) {}

  sync_family_OffistaData(record) {
    let family_obj = [];
    let transferFields = [];
    const spouse = TRANSFER_LIST.spouse.fields;
    const spouse_spare = TRANSFER_LIST.spouse_spare.fields;
    const numbered_dependents = TRANSFER_LIST.numbered_dependents.fields;

    if (record["連絡種別"].value === "入社連絡") {
      if (record["配偶者はいますか"].value[0] === "はい") {
        let spouse_data = this.convertKintoneToOffista(record, spouse);
        family_obj.push(spouse_data);
      }
      let family_count = parseInt(record["配偶者以外の家族人数"].value, 10);
      for (let i = 2; i <= family_count + 1; i++) {
        let target_dependents = JSON.parse(JSON.stringify(numbered_dependents));
        target_dependents.forEach((elem) => {
          elem.from = elem.from.replace("{i}", String(i)); // プレースホルダーを置換
        });
        let numbered_dependents_data = this.convertKintoneToOffista(
          record,
          target_dependents
        );
        family_obj.push(numbered_dependents_data);
      }
    } else if (
      record["連絡種別"].value === "家族の追加" ||
      record["連絡種別"].value === "家族の扶養変更"
    ) {
      if (record["区分"].value === "家族") {
        transferFields = spouse.concat(spouse_spare);
      }
      else if (record["区分"].value === "配偶者") {
        transferFields = spouse
      }
      let spouse_data = this.convertKintoneToOffista(record, transferFields);
      family_obj.push(spouse_data);
    }
    return family_obj;
  }

  async checkCompanyResist(companyName) {
    let result = await this.offistaInstance.get_consignment_customer();

    let stationId = "";
    result.forEach((element) => {
      if (element.customer_name === companyName) stationId = element.identifier;
    });

    if (stationId === "")
      console.error(
        `"${companyName}" is not defined on the office station server.`
      );
    return stationId;
  }

  async upload(companyName, dataObj) {
    this.stationId = await this.checkCompanyResist(companyName);
    if (this.stationId === "")
      return {
        is_successed: false,
        error_message: `"${companyName}" is not defined on the office station server.`,
      };
    try {
      const resistResult = await this.offistaInstance.entry_employee(
        this.stationId,
        [dataObj]
      );

      if (!resistResult.is_successed) {
        console.error(
          `Failed to entry employee data.\n${resistResult.error_message}`
        );
        if (
          resistResult.error_message.includes(
            "既に登録されている従業員が存在します"
          )
        ) {
          return this.update(companyName, dataObj);
        } else
          return {
            is_successed: false,
            error_message: resistResult.error_message,
          };
      }

      return { is_successed: true, error_message: "" };
    } catch (e) {
      console.error(e);
      return { is_successed: false, error_message: e.message || e };
    }
  }

  async update(companyName, dataObj) {
    this.stationId = await this.checkCompanyResist(companyName);
    if (this.stationId === "")
      return {
        is_successed: false,
        error_message: `"${companyName}" is not defined on the office station server.`,
      };
    try {
      const resistResult = await this.offistaInstance.modify_employee(
        this.stationId,
        [dataObj]
      );

      if (!resistResult.is_successed) {
        console.error(
          `Failed to modefy employee data.\n${resistResult.error_message}`
        );
        return {
          is_successed: false,
          error_message: resistResult.error_message,
        };
      } else return { is_successed: true, error_message: "" };
    } catch (e) {
      console.error(e);
      return { is_successed: false, error_message: e.message || e };
    }
  }

  async sync(kintoneRecord) {
    const companyName = kintoneRecord["会社名"].value;
    const personal_data = await this.sync_personal_OffistaData(kintoneRecord);
    const family_data = await this.sync_family_OffistaData(kintoneRecord);

    const upload_data = { ...personal_data, ...{ family: family_data } };
    console.log("upload_data: ", upload_data); // ここでログを追加
    return await this.upload(companyName, upload_data);
  }
};
