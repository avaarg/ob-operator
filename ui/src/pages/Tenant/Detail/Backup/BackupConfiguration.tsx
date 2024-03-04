import { getNSName } from '@/pages/Cluster/Detail/Overview/helper';
import {
  deletePolicyOfTenant,
  getBackupPolicy,
  updateBackupPolicyOfTenant,
} from '@/services/tenant';
import { intl } from '@/utils/intl';
import { useRequest } from 'ahooks';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  InputNumber,
  Row,
  Select,
  Space,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import {
  checkIsSame,
  formatBackupForm,
  formatBackupPolicyData,
} from '../../helper';
import BakMethodsList from '../NewBackup/BakMethodsList';
import SchduleSelectFormItem from '../NewBackup/SchduleSelectFormItem';
import ScheduleTimeFormItem from '../NewBackup/ScheduleTimeFormItem';
interface BackupConfigurationProps {
  backupPolicy: API.BackupPolicy;
  setBackupPolicy: React.Dispatch<
    React.SetStateAction<API.BackupPolicy | undefined>
  >;
}

export default function BackupConfiguration({
  backupPolicy,
  setBackupPolicy,
}: BackupConfigurationProps) {
  const [form] = Form.useForm();
  const scheduleValue = Form.useWatch(['scheduleDates'], form);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<number>(0);
  const [loading, setIsLoading] = useState<boolean>(false);
  const curConfig = useRef({});
  const [ns, name] = getNSName();

  const INFO_CONFIG = {
    archivePath: {
      label: intl.formatMessage({
        id: 'Dashboard.Detail.Backup.BackupConfiguration.LogArchivePath',
        defaultMessage: '日志归档路径',
      }),
    },
    bakDataPath: {
      label: intl.formatMessage({
        id: 'Dashboard.Detail.Backup.BackupConfiguration.DataBackupPath',
        defaultMessage: '数据备份路径',
      }),
    },
    status: {
      label: intl.formatMessage({
        id: 'Dashboard.Detail.Backup.BackupConfiguration.Status',
        defaultMessage: '状态',
      }),
    },
    destType: {
      label: intl.formatMessage({
        id: 'Dashboard.Detail.Backup.BackupConfiguration.BackupType',
        defaultMessage: '备份类型',
      }),
      editRender: (
        <Select
          style={{ width: 216 }}
          options={[
            {
              label: 'OSS',
              value: 'OSS',
            },
            {
              label: 'NFS',
              value: 'NFS',
            },
          ]}
        />
      ),
    },
  };
  if (backupPolicy.ossAccessSecret) {
    INFO_CONFIG.ossAccessSecret = {
      label: 'OSS Access Secret',
    };
  }
  const DATE_CONFIG = {
    jobKeepWindow: intl.formatMessage({
      id: 'Dashboard.Detail.Backup.BackupConfiguration.BackupTaskRetention',
      defaultMessage: '备份任务保留',
    }),
    recoveryWindow: intl.formatMessage({
      id: 'Dashboard.Detail.Backup.BackupConfiguration.DataRecoveryWindow',
      defaultMessage: '数据恢复窗口',
    }),
    pieceInterval: intl.formatMessage({
      id: 'Dashboard.Detail.Backup.BackupConfiguration.ArchiveSliceInterval',
      defaultMessage: '归档切片间隔',
    }),
  };

  const initialValues = {
    ...backupPolicy,
    scheduleDates: {
      ...formatBackupPolicyData(backupPolicy),
    },
    scheduleTime: dayjs(backupPolicy.scheduleTime, 'HH:mm'),
  };

  const { run: getBackupPolicyReq } = useRequest(getBackupPolicy, {
    manual: true,
    pollingInterval, //Polling
    onSuccess: ({ successful, data }) => {
      if (successful) {
        if (
          !checkIsSame(
            data,
            JSON.stringify(form.getFieldsValue()) === '{}'
              ? curConfig.current
              : form.getFieldsValue(),
          ) &&
          pollingInterval === 0
        ) {
          setPollingInterval(300);
        } else {
          setIsLoading(false);
          setBackupPolicy(data);
          setPollingInterval(0); //Stop polling
          message.success(
            intl.formatMessage({
              id: 'Dashboard.Detail.Backup.BackupConfiguration.OperationSucceeded',
              defaultMessage: '操作成功',
            }),
          );
        }
      }
    },
  });

  const { run: deleteBackupPolicyReq } = useRequest(deletePolicyOfTenant, {
    manual: true,
    onSuccess: ({ successful, data }) => {
      if (successful) {
        setIsLoading(true);
        getBackupPolicyReq({ ns, name });
      }
    },
  });

  const changeStatus = async () => {
    let param = {
      ns,
      name,
      status: backupPolicy.status === 'PAUSED' ? 'RUNNING' : 'PAUSED',
    };
    const { successful, data } = await updateBackupPolicyOfTenant(param);
    if (successful) {
      if (data.status === backupPolicy.status) {
        setIsLoading(true);
        getBackupPolicyReq({ ns, name });
      } else {
        message.success(
          intl.formatMessage({
            id: 'Dashboard.Detail.Backup.BackupConfiguration.OperationSucceeded.1',
            defaultMessage: '操作成功！',
          }),
        );
      }
    }
  };

  const changeEditBtnStatus = () => {
    if (!isEdit) {
      setIsEdit(!isEdit);
      return;
    }

    if (
      checkIsSame(
        formatBackupForm(initialValues),
        formatBackupForm(form.getFieldsValue()),
      )
    ) {
      message.info(
        intl.formatMessage({
          id: 'Dashboard.Detail.Backup.BackupConfiguration.NoConfigurationChangeDetected',
          defaultMessage: '未检测到配置更改',
        }),
      );
      setIsEdit(!isEdit);
      return;
    }

    form.submit();
  };

  const updateBackupPolicyConfig = async (values) => {
    const { successful, data } = await updateBackupPolicyOfTenant({
      ns,
      name,
      ...formatBackupForm(values),
    });
    if (successful) {
      curConfig.current = formatBackupForm(form.getFieldsValue());
      if (checkIsSame(data, curConfig.current)) {
        setIsLoading(true);
        getBackupPolicyReq({ ns, name });
      } else {
        setBackupPolicy(data);
        setIsEdit(!isEdit);
        message.success(
          intl.formatMessage({
            id: 'Dashboard.Detail.Backup.BackupConfiguration.OperationSucceeded.2',
            defaultMessage: '操作成功!',
          }),
        );
      }
    }
  };

  return (
    <Card
      title={intl.formatMessage({
        id: 'Dashboard.Detail.Backup.BackupConfiguration.BackupPolicyConfiguration',
        defaultMessage: '备份策略配置',
      })}
      style={{ width: '100%' }}
      loading={loading}
      extra={
        <Space>
          <Button type="primary" onClick={changeEditBtnStatus}>
            {isEdit
              ? intl.formatMessage({
                  id: 'Dashboard.Detail.Backup.BackupConfiguration.UpdateConfiguration',
                  defaultMessage: '更新配置',
                })
              : intl.formatMessage({
                  id: 'Dashboard.Detail.Backup.BackupConfiguration.Edit',
                  defaultMessage: '编辑',
                })}
          </Button>
          <Button
            disabled={
              backupPolicy.status !== 'RUNNING' &&
              backupPolicy.status !== 'PAUSED'
            }
            onClick={changeStatus}
          >
            {backupPolicy.status === 'PAUSING' ||
            backupPolicy.status === 'PAUSED'
              ? intl.formatMessage({
                  id: 'Dashboard.Detail.Backup.BackupConfiguration.Recovery',
                  defaultMessage: '恢复',
                })
              : intl.formatMessage({
                  id: 'Dashboard.Detail.Backup.BackupConfiguration.Pause',
                  defaultMessage: '暂停',
                })}
          </Button>
          <Button
            onClick={() => deleteBackupPolicyReq({ ns, name })}
            type="primary"
            danger
          >
            {intl.formatMessage({
              id: 'Dashboard.Detail.Backup.BackupConfiguration.Delete',
              defaultMessage: '删除',
            })}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        onFinish={updateBackupPolicyConfig}
        initialValues={initialValues}
      >
        <Row style={{ marginBottom: 24 }} gutter={[12, 12]}>
          {Object.keys(INFO_CONFIG).map((key, index) => (
            <Col style={{ display: 'flex' }} key={index} span={8}>
              {isEdit && INFO_CONFIG[key].editRender ? (
                <Form.Item label={INFO_CONFIG[key].label} name={key}>
                  {INFO_CONFIG[key].editRender}
                </Form.Item>
              ) : (
                <>
                  <span
                    style={{ marginRight: 8, color: '#8592AD', flexShrink: 0 }}
                  >
                    {INFO_CONFIG[key].label}:
                  </span>
                  <span>{backupPolicy[key]}</span>
                </>
              )}
            </Col>
          ))}
        </Row>
        <Row>
          <Col span={12}>
            <SchduleSelectFormItem
              disable={!isEdit}
              form={form}
              scheduleValue={scheduleValue}
            />
          </Col>
          <Col span={12}>
            <ScheduleTimeFormItem disable={!isEdit} />
          </Col>
          <Col span={12}>
            <BakMethodsList disable={!isEdit} form={form} />
          </Col>
          <Col span={24}>
            <Descriptions>
              {backupPolicy.bakEncryptionSecret && (
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'Dashboard.Detail.Backup.BackupConfiguration.EncryptPasswordInformation',
                    defaultMessage: '加密密码信息',
                  })}
                >
                  {backupPolicy.bakEncryptionSecret}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>

          {isEdit ? (
            Object.keys(DATE_CONFIG).map((key, index) => (
              <Col span={8} key={index}>
                <Form.Item label={DATE_CONFIG[key]} name={key}>
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
            ))
          ) : (
            <Descriptions>
              {Object.keys(DATE_CONFIG).map((key, index) => (
                <Descriptions.Item label={DATE_CONFIG[key]} key={index}>
                  {backupPolicy[key]}
                  {intl.formatMessage({
                    id: 'Dashboard.Detail.Backup.BackupConfiguration.Days',
                    defaultMessage: '天',
                  })}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </Row>
      </Form>
    </Card>
  );
}